import {
	Plugin,
	debounce,
	setIcon,
	requestUrl,
	Notice,
	WorkspaceLeaf,
} from "obsidian";
import fs from "fs";
import path from "path";
import MusicMetadata from "music-metadata";
import Observable from "src/Utils/Observable";
import { ReactView, SOUNDSCAPES_REACT_VIEW } from "./Views/ReactView";
import getAllMusicFiles from "src/Utils/getAllMusicFiles";
import { LocalPlayerState, Player } from "src/Types/Interfaces";
import { PLAYER_STATE, SOUNDSCAPE_TYPE } from "src/Types/Enums";
import SOUNDSCAPES from "src/Soundscapes";
import {
	DEFAULT_SETTINGS,
	SoundscapesPluginSettings,
	SoundscapesSettingsTab,
} from "src/Settings/Settings";
import createShuffleQueue from "src/Utils/createShuffleQueue";

/**
 * This allows a "live-reload" of Obsidian when developing the plugin.
 * Any changes to the code will force reload Obsidian.
 */
if (process.env.NODE_ENV === "development") {
	new EventSource("http://127.0.0.1:8000/esbuild").addEventListener(
		"change",
		() => location.reload()
	);
}

export default class SoundscapesPlugin extends Plugin {
	settings: SoundscapesPluginSettings;
	settingsObservable: Observable;
	localPlayerStateObservable: Observable;
	player: Player;
	localPlayer: HTMLAudioElement;
	statusBarItem: HTMLElement;
	playButton: HTMLButtonElement;
	pauseButton: HTMLButtonElement;
	nextButton: HTMLButtonElement;
	previousButton: HTMLButtonElement;
	nowPlaying: HTMLDivElement;
	volumeMutedIcon: HTMLDivElement;
	volumeLowIcon: HTMLDivElement;
	volumeHighIcon: HTMLDivElement;
	volumeSlider: HTMLInputElement;
	ribbonButton: HTMLElement;
	debouncedSaveSettings: Function;
	soundscapeType: SOUNDSCAPE_TYPE;
	currentTrackIndex: number = 0;
	reindexTimer: NodeJS.Timeout | null = null;
	shuffleQueue: number[] = [];
	shuffleQueueSpot: number = 0;

	async onload() {
		await this.loadSettings();

		this.currentTrackIndex = this.settings.currentTrackIndex; // Persist the current track when closing and opening
		this.settingsObservable = new Observable(this.settings);
		this.localPlayerStateObservable = new Observable({});
		this.debouncedSaveSettings = debounce(this.saveSettings, 500, true);

		this.versionCheck();

		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.addClass("soundscapesroot");
		this.createPlayer();

		this.registerView(
			SOUNDSCAPES_REACT_VIEW,
			(leaf) =>
				new ReactView(
					this,
					this.settingsObservable,
					this.localPlayerStateObservable,
					leaf
				)
		);

		this.ribbonButton = this.addRibbonIcon(
			"music",
			"Soundscapes: My Music",
			() => {
				this.OpenMyMusicView();
			}
		);
		this.ribbonButton.hide();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SoundscapesSettingsTab(this.app, this));

		if (this.settings.soundscape === SOUNDSCAPE_TYPE.MY_MUSIC) {
			this.ribbonButton.show();

			// Delay this so startup isn't impacted
			setTimeout(() => {
				this.indexMusicLibrary();
			}, 1000);
		}
	}

	onunload() {
		// Clear any timers if they exist
		if (this.reindexTimer) {
			clearTimeout(this.reindexTimer);
		}
	}

	/**
	 * Because we only have the id of the current soundscape, we need a helper function to get the soundscape itself when it's a custom one
	 * @returns
	 */
	getCurrentCustomSoundscape() {
		return this.settings.customSoundscapes.find(
			(soundscape) =>
				soundscape.id ===
				this.settings.soundscape.split(`${SOUNDSCAPE_TYPE.CUSTOM}_`)[1]
		);
	}

	/******************************************************************************************************************/
	//#region Startup
	/******************************************************************************************************************/

	/**
	 * Check the local plugin version against github. If there is a new version, notify the user.
	 */
	async versionCheck() {
		const localVersion = process.env.PLUGIN_VERSION;
		const stableVersion = await requestUrl(
			"https://raw.githubusercontent.com/andrewmcgivery/obsidian-soundscapes/main/package.json"
		).then(async (res) => {
			if (res.status === 200) {
				const response = await res.json;
				return response.version;
			}
		});
		const betaVersion = await requestUrl(
			"https://raw.githubusercontent.com/andrewmcgivery/obsidian-soundscapes/beta/package.json"
		).then(async (res) => {
			if (res.status === 200) {
				const response = await res.json;
				return response.version;
			}
		});

		if (localVersion?.indexOf("beta") !== -1) {
			if (localVersion !== betaVersion) {
				new Notice(
					"There is a beta update available for the Soundscapes plugin. Please update to to the latest version to get the latest features!",
					0
				);
			}
		} else if (localVersion !== stableVersion) {
			new Notice(
				"There is an update available for the Soundscapes plugin. Please update to to the latest version to get the latest features!",
				0
			);
		}
	}

	/**
	 * Given a file path in settings, get all the music files in that folder.
	 * Convert those music files to a index of their music metadata.
	 * Finally, reschedule the next reindex based on settings.
	 */
	async indexMusicLibrary() {
		console.time("MusicIndex");
		const filePath = this.settings.myMusicFolderPath;

		// Clear any timers if they exist
		if (this.reindexTimer) {
			clearTimeout(this.reindexTimer);
		}

		if (filePath.trim() === "") {
			new Notice(
				"Please set music file path in settings to use My Music feature of Soundscapes.",
				0
			);
			return;
		}

		new Notice("Soundscapes: Indexing local music files...");

		const musicFilePaths = getAllMusicFiles(filePath);

		const musicPromises = musicFilePaths.map(async (filePath) => {
			const metadata = await MusicMetadata.parseFile(filePath, {
				skipCovers: true,
			});

			return {
				fileName: path.basename(filePath),
				fullPath: filePath,
				title:
					metadata.common.title ||
					path.basename(filePath).replace(/\.(mp3)$/gi, ""),
				artist: metadata.common.artist,
				album: metadata.common.album,
				duration: metadata.format.duration,
			};
		});

		const songs = await Promise.all(musicPromises);
		console.timeEnd("MusicIndex");
		this.settings.myMusicIndex = songs;

		new Notice(
			`Soundscapes: Indexing complete. ${songs.length} songs were indexed.`
		);

		if (songs.length === 0) {
			new Notice(
				`Warning: Soundscapes found no songs at the configured file path.`
			);
		}

		this.saveSettings();

		// Reschedule index based on settings
		if (this.settings.reindexFrequency !== "never") {
			this.reindexTimer = setTimeout(
				() => this.indexMusicLibrary(),
				60000 * parseInt(this.settings.reindexFrequency)
			);
		}
	}

	/******************************************************************************************************************/
	//#endregion Startup
	/******************************************************************************************************************/

	/******************************************************************************************************************/
	//#region Create UI Elements
	/******************************************************************************************************************/

	/**
	 * Opens react view of MyMusic
	 */
	async OpenMyMusicView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(SOUNDSCAPES_REACT_VIEW);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf for it
			leaf = workspace.getLeaf(true);
			await leaf.setViewState({
				type: SOUNDSCAPES_REACT_VIEW,
				active: true,
			});
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf);
	}

	/**
	 * Create the Youtube player
	 */
	createPlayer() {
		// Load in youtube iframe api script
		this.statusBarItem.createEl("script", {
			attr: {
				src: "https://www.youtube.com/iframe_api",
			},
		});

		// Create div to insert the video into
		this.statusBarItem.createEl("div", {
			attr: { id: "player" },
			cls: "soundscapesroot-player",
		});

		// Create local media player and listen to events
		this.localPlayer = new Audio();
		this.localPlayer.volume = this.settings.volume / 100;
		this.localPlayer.addEventListener("play", () => {
			this.onStateChange({ data: PLAYER_STATE.PLAYING });
		});
		this.localPlayer.addEventListener("pause", () => {
			this.onStateChange({ data: PLAYER_STATE.PAUSED });
		});
		this.localPlayer.addEventListener("ended", () => {
			this.onStateChange({ data: PLAYER_STATE.ENDED });
		});

		this.localPlayer.addEventListener("timeupdate", () => {
			this.updateLocalPlayerState({
				currentTime: this.localPlayer.currentTime,
			});
		});

		// Once the API is ready, create a player
		// @ts-ignore
		window.onYouTubeIframeAPIReady = () => {
			// @ts-ignore
			this.player = new YT.Player("player", {
				height: "100",
				width: "200",
				playerVars: {
					playsinline: 1,
					fs: 0,
					disablekb: 1,
					controls: 0,
				},
				events: {
					onReady: this.onPlayerReady.bind(this),
					onStateChange: (e: any) => {
						// This is to suppress the player from sending events when it's not the active player
						if (
							this.settings.soundscape !==
							SOUNDSCAPE_TYPE.MY_MUSIC
						) {
							this.onStateChange.bind(this)(e);
						}
					},
				},
			});
		};
	}

	/**
	 * Create all the UI elements
	 */
	createControls() {
		this.previousButton = this.statusBarItem.createEl("button", {
			cls: "soundscapesroot-previousbutton",
		});
		setIcon(this.previousButton, "skip-back");
		this.previousButton.onclick = () => this.previous();

		this.playButton = this.statusBarItem.createEl("button", {});
		setIcon(this.playButton, "play");
		this.playButton.onclick = () => this.play();

		this.pauseButton = this.statusBarItem.createEl("button", {});
		setIcon(this.pauseButton, "pause");
		this.pauseButton.onclick = () => this.pause();

		this.nextButton = this.statusBarItem.createEl("button", {
			cls: "soundscapesroot-nextbutton",
		});
		setIcon(this.nextButton, "skip-forward");
		this.nextButton.onclick = () => this.next();

		this.nowPlaying = this.statusBarItem
			.createEl("div", {
				cls: "soundscapesroot-nowplaying",
			})
			.createEl("div", {
				cls: "soundscapesroot-nowplaying-text",
			});

		const volumeIcons = this.statusBarItem.createEl("div", {
			cls: "soundscapesroot-volumeIcons",
		});

		this.volumeMutedIcon = volumeIcons.createEl("div", {
			cls: "soundscapesroot-volumeIcons-iconmuted",
		});
		setIcon(this.volumeMutedIcon, "volume-x");

		this.volumeLowIcon = volumeIcons.createEl("div", {
			cls: "soundscapesroot-volumeIcons-iconlow",
		});
		setIcon(this.volumeLowIcon, "volume-1");

		this.volumeHighIcon = volumeIcons.createEl("div", {
			cls: "soundscapesroot-volumeIcons-iconhigh",
		});
		setIcon(this.volumeHighIcon, "volume-2");

		this.volumeSlider = this.statusBarItem.createEl("input", {
			attr: {
				type: "range",
				min: 0,
				max: 100,
				value: this.settings.volume,
			},
		});
		// Create a virtual event object
		this.onVolumeChange({ target: { value: this.settings.volume } });

		this.volumeSlider.addEventListener(
			"input",
			this.onVolumeChange.bind(this)
		);
	}

	/******************************************************************************************************************/
	//#endregion Create UI Elements
	/******************************************************************************************************************/

	/******************************************************************************************************************/
	//#region Control Player
	/******************************************************************************************************************/

	/**
	 * Plays the current track. When it's a live video, attempt to jump to the "live" portion.
	 */
	play() {
		if (
			this.soundscapeType === SOUNDSCAPE_TYPE.STANDARD &&
			SOUNDSCAPES[this.settings.soundscape].isLiveVideo
		) {
			this.player.seekTo(this.player.getDuration());
		}

		if (this.soundscapeType === SOUNDSCAPE_TYPE.MY_MUSIC) {
			// If we don't currently have an audio source because we recently changed folders but now we do have an index, play the first song
			if (
				this.localPlayer.src === location.href &&
				this.settings.myMusicIndex.length > 0
			) {
				this.currentTrackIndex = 0;
				this.onSoundscapeChange(true);
			} else {
				this.localPlayer.play();
			}
		} else {
			this.player.playVideo();
		}
	}

	/**
	 * Pause the current track.
	 */
	pause() {
		if (this.soundscapeType === SOUNDSCAPE_TYPE.MY_MUSIC) {
			this.localPlayer.pause();
		} else {
			this.player.pauseVideo();
		}
	}

	/**
	 * Skip to the previous track.
	 */
	previous() {
		if (this.soundscapeType === SOUNDSCAPE_TYPE.CUSTOM) {
			const customSoundscape = this.getCurrentCustomSoundscape();

			if (this.currentTrackIndex === 0) {
				this.currentTrackIndex =
					(customSoundscape?.tracks.length || 1) - 1;
			} else {
				this.currentTrackIndex--;
			}
		} else if (this.soundscapeType === SOUNDSCAPE_TYPE.MY_MUSIC) {
			// Are we in shuffle mode?
			if (this.settings.myMusicShuffle) {
				// If Shuffle queue is empty, let's populate it
				if (this.shuffleQueue.length === 0) {
					this.shuffleQueue = createShuffleQueue(
						this.settings.myMusicIndex
					);
					this.shuffleQueueSpot = 0;
				}

				if (this.shuffleQueueSpot === 0) {
					// If we are at the beginning, wrap around to the end!
					this.currentTrackIndex =
						this.shuffleQueue[this.shuffleQueue.length - 1];
				} else {
					// Otherwise, go to the previous song in the shuffle queue
					this.shuffleQueueSpot--;
					this.currentTrackIndex =
						this.shuffleQueue[this.shuffleQueueSpot];
				}
			} else {
				// Not in shuffle mode, go to next song
				if (this.currentTrackIndex === 0) {
					this.currentTrackIndex =
						this.settings.myMusicIndex.length - 1;
				} else {
					this.currentTrackIndex--;
				}
			}
		}
		this.onSoundscapeChange();
	}

	/**
	 * Skip to the next track.
	 */
	next() {
		if (this.soundscapeType === SOUNDSCAPE_TYPE.CUSTOM) {
			const customSoundscape = this.getCurrentCustomSoundscape();

			if (customSoundscape?.tracks[this.currentTrackIndex + 1]) {
				this.currentTrackIndex++;
			} else {
				this.currentTrackIndex = 0;
			}
		} else if (this.soundscapeType === SOUNDSCAPE_TYPE.MY_MUSIC) {
			// Are we in shuffle mode?
			if (this.settings.myMusicShuffle) {
				// If Shuffle queue is empty, let's populate it
				if (this.shuffleQueue.length === 0) {
					this.shuffleQueue = createShuffleQueue(
						this.settings.myMusicIndex
					);
					this.shuffleQueueSpot = 0;
				}

				if (this.shuffleQueueSpot === this.shuffleQueue.length - 1) {
					// If we get to the end of all possible songs to shuffle, go back to the start and reset the shuffle queue
					this.currentTrackIndex = this.shuffleQueue[0];
					this.shuffleQueue = [];
					this.shuffleQueueSpot = 0;
				} else {
					// Otherwise, go to the next song in the shuffle queue
					this.shuffleQueueSpot++;
					this.currentTrackIndex =
						this.shuffleQueue[this.shuffleQueueSpot];
				}
			} else {
				// Not in shuffle mode, go to next song
				if (this.settings.myMusicIndex[this.currentTrackIndex + 1]) {
					this.currentTrackIndex++;
				} else {
					this.currentTrackIndex = 0;
				}
			}
		}
		this.onSoundscapeChange();
	}

	/**
	 * Seek to a specific spot in the song
	 * @param time
	 */
	seek(time: number) {
		if (this.soundscapeType === SOUNDSCAPE_TYPE.MY_MUSIC) {
			this.localPlayer.currentTime = time;
		}
	}

	/**
	 * Changes the currently playing song when in My Music mode
	 * @param fileName
	 */
	changeMyMusicTrack(fileName: string) {
		this.currentTrackIndex = this.settings.myMusicIndex.findIndex(
			(song) => song.fileName === fileName
		);
		this.onSoundscapeChange();
	}

	/**
	 * Turn on shuffle mode. When we toggle it on, reset the shuffle queue.
	 */
	toggleShuffle() {
		this.settings.myMusicShuffle = !this.settings.myMusicShuffle;
		this.saveSettings();

		if (this.settings.myMusicShuffle) {
			this.shuffleQueue = [];
			this.shuffleQueueSpot = 0;
		}
	}

	/******************************************************************************************************************/
	//#endregion Control Player
	/******************************************************************************************************************/

	/******************************************************************************************************************/
	//#region Events
	/******************************************************************************************************************/

	/**
	 * Once the player is ready, create the controls and play some music! (or not if autoplay is disabled)
	 */
	onPlayerReady() {
		this.createControls();
		this.onSoundscapeChange(this.settings.autoplay);
	}

	/**
	 * Update the UI when the state of the video changes
	 */
	onStateChange({ data: state }: { data: PLAYER_STATE }) {
		const customSoundscape = this.getCurrentCustomSoundscape();

		// Next and Previous buttons only apply when we have a playlist-type soundscape
		if (this.soundscapeType === SOUNDSCAPE_TYPE.STANDARD) {
			this.previousButton.hide();
			this.nextButton.hide();
		} else {
			this.previousButton.show();
			this.nextButton.show();
		}

		switch (state) {
			case PLAYER_STATE.UNSTARTED:
				this.playButton.show();
				this.pauseButton.hide();
				break;
			case PLAYER_STATE.PLAYING:
				this.playButton.hide();
				this.pauseButton.show();
				this.updateLocalPlayerState({
					currentTrack:
						this.settings.myMusicIndex[this.currentTrackIndex],
					playerState: PLAYER_STATE.PLAYING,
				});
				break;
			case PLAYER_STATE.PAUSED:
				this.playButton.show();
				this.pauseButton.hide();
				this.updateLocalPlayerState({
					currentTrack:
						this.settings.myMusicIndex[this.currentTrackIndex],
					playerState: PLAYER_STATE.PAUSED,
				});
				break;
			case PLAYER_STATE.ENDED:
				// When it's a playlist-type soundscape, go to the next song
				if (
					this.soundscapeType === SOUNDSCAPE_TYPE.CUSTOM ||
					this.soundscapeType === SOUNDSCAPE_TYPE.MY_MUSIC
				) {
					this.next();
				}
				// For Standard, Loop videos once they end
				// For Custom, we'll go to the next track (per above logic)
				this.onSoundscapeChange();
		}
	}

	/**
	 * When we change the volume (usually via the slider), update the player volume, the UI, and save the current volume to settings
	 */
	onVolumeChange(e: any) {
		const volume = parseInt(e.target.value);
		this.volumeSlider.value = e.target.value;
		this.player.setVolume(volume);
		this.localPlayer.volume = volume / 100; // Audio object expects 0-1

		if (volume === 0) {
			this.volumeMutedIcon.show();
			this.volumeLowIcon.hide();
			this.volumeHighIcon.hide();
		} else if (volume <= 50) {
			this.volumeMutedIcon.hide();
			this.volumeLowIcon.show();
			this.volumeHighIcon.hide();
		} else {
			this.volumeMutedIcon.hide();
			this.volumeLowIcon.hide();
			this.volumeHighIcon.show();
		}

		this.settings.volume = volume;
		// Debounce saves of volume change so we don't hammer the users hard drive
		// However, update the observable immediately to keep UI up to date
		this.settingsObservable.setValue(this.settings);
		this.debouncedSaveSettings();
	}

	/**
	 * Play the selected soundscape!
	 *
	 * When in My Music mode, the song content is read from the file and base64ed. This is because electron blocks
	 * local file paths from being used in the Audio element.
	 */
	onSoundscapeChange(autoplay = true) {
		if (this.settings.soundscape.startsWith(`${SOUNDSCAPE_TYPE.CUSTOM}_`)) {
			this.soundscapeType = SOUNDSCAPE_TYPE.CUSTOM;
		} else if (this.settings.soundscape === SOUNDSCAPE_TYPE.MY_MUSIC) {
			this.soundscapeType = SOUNDSCAPE_TYPE.MY_MUSIC;
		} else {
			this.soundscapeType = SOUNDSCAPE_TYPE.STANDARD;
		}

		if (this.soundscapeType === SOUNDSCAPE_TYPE.CUSTOM) {
			const customSoundscape = this.getCurrentCustomSoundscape();

			this.player.loadVideoById({
				videoId: customSoundscape?.tracks[this.currentTrackIndex].id,
			});
			this.nowPlaying.setText(
				customSoundscape?.tracks[this.currentTrackIndex].name || ""
			);

			if (!autoplay) {
				this.player.pauseVideo();
			}

			this.statusBarItem.removeClass("soundscapesroot--hideyoutube");
			this.localPlayer.pause(); // Edge Case: When switching from MyMusic to Youtube, the youtube video keeps playing
		} else if (this.soundscapeType === SOUNDSCAPE_TYPE.MY_MUSIC) {
			const track = this.settings.myMusicIndex[this.currentTrackIndex];

			if (track) {
				const fileData = fs.readFileSync(track.fullPath);
				const base64Data = fileData.toString("base64");

				this.localPlayer.pause();
				this.localPlayer.src = `data:audio/mp3;base64,${base64Data}`;

				this.nowPlaying.setText(`${track.title} - ${track.artist}`);

				if (autoplay) {
					this.localPlayer.play();
				} else {
					// Need to manually send this cause the state won't be set otherwise
					this.onStateChange({ data: PLAYER_STATE.PAUSED });
				}
			} else {
				// We don't have a track (still indexing or empty index)
				// Reset the player
				this.localPlayer.src = "";
				this.nowPlaying.setText("");
				this.onStateChange({ data: PLAYER_STATE.PAUSED });
			}

			this.statusBarItem.addClass("soundscapesroot--hideyoutube");
			this.player.pauseVideo(); // Edge Case: When switching from youtube to MyMusic, the youtube video keeps playing
		} else {
			this.player.loadVideoById({
				videoId: SOUNDSCAPES[this.settings.soundscape].youtubeId,
			});
			if (SOUNDSCAPES[this.settings.soundscape].isLiveVideo) {
				this.player.seekTo(this.player.getDuration());
			}
			this.nowPlaying.setText(
				SOUNDSCAPES[this.settings.soundscape].nowPlayingText
			);

			if (!autoplay) {
				this.player.pauseVideo();
			}

			this.statusBarItem.removeClass("soundscapesroot--hideyoutube");
			this.localPlayer.pause(); // Edge Case: When switching from MyMusic to Youtube, the youtube video keeps playing
		}

		this.saveSettings();
	}

	/******************************************************************************************************************/
	//#endregion Events
	/******************************************************************************************************************/

	/******************************************************************************************************************/
	//#region Settings and State
	/******************************************************************************************************************/

	/**
	 * Load data from disk, stored in data.json in plugin folder
	 */
	async loadSettings() {
		const data = (await this.loadData()) || {};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
	}

	/**
	 * Save data to disk, stored in data.json in plugin folder
	 */
	async saveSettings() {
		// Persist the current track index
		this.settings.currentTrackIndex = this.currentTrackIndex;

		this.settingsObservable.setValue(this.settings);
		await this.saveData(this.settings);
	}

	/**
	 * Merges the update object with the existing local player state
	 * @param updateObject
	 */
	updateLocalPlayerState(updateObject: LocalPlayerState) {
		this.localPlayerStateObservable.setValue({
			...this.localPlayerStateObservable.getValue(),
			...updateObject,
		});
	}

	/******************************************************************************************************************/
	//#endregion Settings and State
	/******************************************************************************************************************/
}
