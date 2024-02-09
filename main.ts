import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	debounce,
	setIcon,
	requestUrl,
	Notice,
	WorkspaceLeaf,
} from "obsidian";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import MusicMetadata from "music-metadata";
import EditCustomSoundscapeModal from "src/EditCustomSoundscapeModal/EditCustomSoundscapeModal";
import ConfirmModal from "src/ConfirmModal/ConfirmModal";
import Observable from "src/Utils/Observable";
import { ReactView, SOUNDSCAPES_REACT_VIEW } from "./Views/ReactView";

/**
 * TODO: Comment
 * @param dirPath
 * @param fileArray
 */
function getAllMusicFiles(
	dirPath: string,
	fileArray: Array<string> | undefined = undefined
) {
	const files = fs.readdirSync(dirPath);

	fileArray = fileArray || [];

	files.forEach((file) => {
		const filePath = path.join(dirPath, file);
		if (fs.statSync(filePath).isDirectory()) {
			fileArray = getAllMusicFiles(filePath, fileArray);
		} else if (["mp3"].includes(path.extname(filePath).slice(1))) {
			fileArray?.push(filePath);
		}
	});

	return fileArray;
}

// TODO: Consider moving some of these types to different files
export interface CustomSoundscape {
	id: string;
	name: string;
	tracks: CustomSoundscapeTrack[];
}

export interface CustomSoundscapeTrack {
	name: string;
	id: string;
}

interface Soundscape {
	id: string;
	name: string;
	nowPlayingText: string;
	isLiveVideo: boolean;
	youtubeId: string;
	type: SOUNDSCAPE_TYPE;
}

enum SOUNDSCAPE_TYPE {
	STANDARD = "STANDARD",
	CUSTOM = "CUSTOM",
	MY_MUSIC = "MY_MUSIC",
}

// TODO: Consider moving this to a separate file
const SOUNDSCAPES: Record<string, Soundscape> = {
	lofi: {
		id: "lofi",
		name: "Lofi beats",
		nowPlayingText: "Lofi beats",
		isLiveVideo: true,
		youtubeId: "jfKfPfyJRdk",
		type: SOUNDSCAPE_TYPE.STANDARD,
	},
	spa: {
		id: "spa",
		name: "Spa atmosphere",
		nowPlayingText: "Spa atmosphere",
		isLiveVideo: true,
		youtubeId: "luxiL4SQVVE",
		type: SOUNDSCAPE_TYPE.STANDARD,
	},
	sims: {
		id: "sims",
		name: "The Sims complete soundtrack",
		nowPlayingText: "The Sims complete soundtrack",
		isLiveVideo: false,
		youtubeId: "wKnkQdsITUE",
		type: SOUNDSCAPE_TYPE.STANDARD,
	},
	thunder: {
		id: "thunder",
		name: "Thunderstorm",
		nowPlayingText: "Thunderstorm",
		isLiveVideo: false,
		youtubeId: "nDq6TstdEi8",
		type: SOUNDSCAPE_TYPE.STANDARD,
	},
	fire: {
		id: "fire",
		name: "Cozy fireplace",
		nowPlayingText: "Cozy fireplace",
		isLiveVideo: false,
		youtubeId: "rCYzRXLWcIg",
		type: SOUNDSCAPE_TYPE.STANDARD,
	},
	birds: {
		id: "birds",
		name: "Birds chirping",
		nowPlayingText: "Birds chirping",
		isLiveVideo: false,
		youtubeId: "mFjU4JuJgnM",
		type: SOUNDSCAPE_TYPE.STANDARD,
	},
	ocean: {
		id: "ocean",
		name: "Ocean waves",
		nowPlayingText: "Ocean waves",
		isLiveVideo: false,
		youtubeId: "bn9F19Hi1Lk",
		type: SOUNDSCAPE_TYPE.STANDARD,
	},
	jazz: {
		id: "jazz",
		name: "Relaxing jazz",
		nowPlayingText: "Relaxing jazz",
		isLiveVideo: false,
		youtubeId: "tNvh2w8lTes",
		type: SOUNDSCAPE_TYPE.STANDARD,
	},
	coffeeshop: {
		id: "coffeeshop",
		name: "Coffee shop ambience",
		nowPlayingText: "Coffee shop ambience",
		isLiveVideo: false,
		youtubeId: "uiMXGIG_DQo",
		type: SOUNDSCAPE_TYPE.STANDARD,
	},
	animalcrossing: {
		id: "animalcrossing",
		name: "Animal Crossing New Horizons",
		nowPlayingText: "Animal Crossing New Horizons",
		isLiveVideo: false,
		youtubeId: "zru-TLye9jo",
		type: SOUNDSCAPE_TYPE.STANDARD,
	},
	yakuzabar: {
		id: "yakuzabar",
		name: "Yakuza/Like a Dragon bar ambience",
		nowPlayingText: "Yakuza bar ambience",
		isLiveVideo: false,
		youtubeId: "Q0GtyZbHJDM",
		type: SOUNDSCAPE_TYPE.STANDARD,
	},
	nintendo: {
		id: "nintendo",
		name: "Calm Nintendo music",
		nowPlayingText: "Calm Nintendo music",
		isLiveVideo: false,
		youtubeId: "sA0qrPOMy2Y",
		type: SOUNDSCAPE_TYPE.STANDARD,
	},
	skycotl: {
		id: "skycotl",
		name: "Sky: Children of the Light",
		nowPlayingText: "Sky: Children of the Light",
		isLiveVideo: false,
		youtubeId: "87etrUp83Yc",
		type: SOUNDSCAPE_TYPE.STANDARD,
	},
};

// Documentation: https://developers.google.com/youtube/iframe_api_reference
interface Player {
	playVideo(): void;
	pauseVideo(): void;
	seekTo(position: number): void;
	getDuration(): number;
	setVolume(volume: Number): void;
	loadVideoById(options: { videoId: String | undefined }): void;
}

// Documentation: https://developers.google.com/youtube/iframe_api_reference
export enum PLAYER_STATE {
	UNSTARTED = -1,
	ENDED = 0,
	PLAYING = 1,
	PAUSED = 2,
	BUFFERING = 3,
	VIDEO_CUED = 5,
}

interface LocalMusicFile {
	fileName: string;
	fullPath: string;
	title: string | undefined | null;
	artist: string | undefined | null;
	album: string | undefined | null;
	duration: number | undefined | null;
}

export interface LocalPlayerState {
	currentTrack?: LocalMusicFile | undefined;
	playerState?: PLAYER_STATE | undefined;
	currentTime?: number | undefined;
}

// TODO: Definitely move these settings types and the settings class itself to a separate file
export interface SoundscapesPluginSettings {
	soundscape: string;
	volume: number;
	autoplay: boolean;
	customSoundscapes: CustomSoundscape[];
	myMusicIndex: LocalMusicFile[];
}

const DEFAULT_SETTINGS: SoundscapesPluginSettings = {
	soundscape: "lofi",
	volume: 25,
	autoplay: false,
	customSoundscapes: [],
	myMusicIndex: [],
};

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
	debouncedSaveSettings: Function;
	soundscapeType: SOUNDSCAPE_TYPE;
	currentTrackIndex: number = 0;

	async onload() {
		await this.loadSettings();

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

		// TODO: How to hide this when setting is not set to My Music?
		this.addRibbonIcon("music", "Soundscapes: My Music", () => {
			this.OpenMyMusicView();
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SoundscapesSettingsTab(this.app, this));

		// Delay this so startup isn't impacted
		// TODO: Only do this when setting is set to My Music
		setTimeout(() => {
			this.indexMusicLibrary();
		}, 1000);
	}

	onunload() {}

	/**
	 * Check the local plugin version against github. If there is a new version, notify the user.
	 */
	versionCheck() {
		requestUrl(
			"https://raw.githubusercontent.com/andrewmcgivery/obsidian-soundscapes/main/package.json"
		).then(async (res) => {
			if (res.status === 200) {
				const response = await res.json;
				const localVersion = process.env.PLUGIN_VERSION;
				const remoteVersion = response.version;

				if (localVersion !== remoteVersion) {
					new Notice(
						"There is an update available for the Soundscapes plugin. Please update to to the latest version to get the latest features!",
						0
					);
				}
			}
		});
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
	 * Once the player is ready, create the controls and play some music! (or not if autoplay is disabled)
	 */
	onPlayerReady() {
		this.createControls();
		this.onSoundscapeChange(this.settings.autoplay);
	}

	/**
	 * TODO: Comment
	 * @param updateObject
	 */
	updateLocalPlayerState(updateObject: LocalPlayerState) {
		this.localPlayerStateObservable.setValue({
			...this.localPlayerStateObservable.getValue(),
			...updateObject,
		});
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

		// This is being triggered because the youtube player is throwing a pause event when we're switching to MyMusic

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
				// When it's a playlist-type soundscape, go to the next track, or wrap back around to the first track if at the end
				if (this.soundscapeType === SOUNDSCAPE_TYPE.CUSTOM) {
					if (customSoundscape?.tracks[this.currentTrackIndex + 1]) {
						this.currentTrackIndex++;
					} else {
						this.currentTrackIndex = 0;
					}
				} else if (this.soundscapeType === SOUNDSCAPE_TYPE.MY_MUSIC) {
					if (
						this.settings.myMusicIndex[this.currentTrackIndex + 1]
					) {
						this.currentTrackIndex++;
					} else {
						this.currentTrackIndex = 0;
					}
				}
				// For Standard, Loop videos once they end
				// For Custom, we'll go to the next track (per above logic)
				this.onSoundscapeChange();
		}
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

		this.nowPlaying = this.statusBarItem.createEl("div", {
			cls: "soundscapesroot-nowplaying",
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

	/**
	 * TODO: Comment
	 */
	play() {
		// When it's a live video, attempt to jump to the "live" portion
		if (
			this.soundscapeType === SOUNDSCAPE_TYPE.STANDARD &&
			SOUNDSCAPES[this.settings.soundscape].isLiveVideo
		) {
			this.player.seekTo(this.player.getDuration());
		}

		if (this.soundscapeType === SOUNDSCAPE_TYPE.MY_MUSIC) {
			this.localPlayer.play();
		} else {
			this.player.playVideo();
		}
	}

	/**
	 * TODO: Comment
	 */
	pause() {
		if (this.soundscapeType === SOUNDSCAPE_TYPE.MY_MUSIC) {
			this.localPlayer.pause();
		} else {
			this.player.pauseVideo();
		}
	}

	/**
	 * TODO: Comment
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
			if (this.currentTrackIndex === 0) {
				this.currentTrackIndex = this.settings.myMusicIndex.length - 1;
			} else {
				this.currentTrackIndex--;
			}
		}
		this.onSoundscapeChange();
	}

	/**
	 * TODO: Comment
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
			if (this.settings.myMusicIndex[this.currentTrackIndex + 1]) {
				this.currentTrackIndex++;
			} else {
				this.currentTrackIndex = 0;
			}
		}
		this.onSoundscapeChange();
	}

	/**
	 * TODO: Comment
	 * @param time
	 */
	seek(time: number) {
		if (this.soundscapeType === SOUNDSCAPE_TYPE.MY_MUSIC) {
			this.localPlayer.currentTime = time;
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
	 * TODO: update Comment
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
			const fileData = fs.readFileSync(track.fullPath);
			const base64Data = fileData.toString("base64");

			this.localPlayer.pause();
			this.localPlayer.src = `data:audio/mp3;base64,${base64Data}`;

			if (autoplay) {
				this.localPlayer.play();
			} else {
				// Need to manually send this cause the state won't be set otherwise
				this.onStateChange({ data: PLAYER_STATE.PAUSED });
			}

			this.nowPlaying.setText(
				`${track.title || track.fileName} - ${track.artist}`
			);

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
			this.statusBarItem.removeClass("soundscapesroot--hideyoutube");
			this.localPlayer.pause(); // Edge Case: When switching from MyMusic to Youtube, the youtube video keeps playing
		}
	}

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
		this.settingsObservable.setValue(this.settings);
		await this.saveData(this.settings);
	}

	/**
	 * TODO: Comment
	 */
	async indexMusicLibrary() {
		console.time("MusicIndex");
		const filePath = "E:/Music/iTunes/iTunes Media/Music";
		const musicFilePaths = getAllMusicFiles(filePath);

		const musicPromises = musicFilePaths.map(async (filePath) => {
			const metadata = await MusicMetadata.parseFile(filePath, {
				skipCovers: true,
			});

			return {
				fileName: path.basename(filePath),
				fullPath: filePath,
				title: metadata.common.title,
				artist: metadata.common.artist,
				album: metadata.common.album,
				duration: metadata.format.duration,
			};
		});

		const songs = await Promise.all(musicPromises);
		console.timeEnd("MusicIndex");
		console.log(`Music Index: ${songs.length} songs indexed.`);
		this.settings.myMusicIndex = songs;
		this.saveSettings();

		// Reindex every 5 minutes
		// TODO: Should this be in settings?
		// TODO: Save this timer to a local variable so it can be cleared on unload or when we want to manually reindex
		setTimeout(() => this.indexMusicLibrary(), 60000 * 5);
	}

	/**
	 * TODO: Comment, group with other methods like play and week
	 * @param fileName
	 */
	changeMyMusicTrack(fileName: string) {
		this.currentTrackIndex = this.settings.myMusicIndex.findIndex(
			(song) => song.fileName === fileName
		);
		this.onSoundscapeChange();
	}

	/**
	 * TODO: Comment
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
}

// TODO: Move to a separate file
export class SoundscapesSettingsTab extends PluginSettingTab {
	plugin: SoundscapesPlugin;

	constructor(app: App, plugin: SoundscapesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Soundscape")
			.setDesc(`Which soundscape would you like to listen to?`)
			.addDropdown((component) => {
				Object.values(SOUNDSCAPES).forEach((soundscape) => {
					component.addOption(soundscape.id, soundscape.name);
				});

				this.plugin.settings.customSoundscapes.forEach(
					(customSoundscape) => {
						if (customSoundscape.tracks.length > 0) {
							component.addOption(
								`${SOUNDSCAPE_TYPE.CUSTOM}_${customSoundscape.id}`,
								customSoundscape.name
							);
						}
					}
				);

				component.addOption(SOUNDSCAPE_TYPE.MY_MUSIC, "My Music");

				component.setValue(this.plugin.settings.soundscape);

				component.onChange((value: string) => {
					this.plugin.settings.soundscape = value;

					if (
						this.plugin.settings.soundscape.startsWith(
							`${SOUNDSCAPE_TYPE.CUSTOM}_`
						)
					) {
						this.plugin.currentTrackIndex = 0;
					}

					this.plugin.onSoundscapeChange();
					this.plugin.saveSettings();
					this.display();
				});
			});

		new Setting(containerEl)
			.setName("Autoplay soundscape")
			.setDesc(`Automatically play chosen soundscape on startup?`)
			.addToggle((component) => {
				component.setValue(this.plugin.settings.autoplay);
				component.onChange((value) => {
					this.plugin.settings.autoplay = value;
					this.plugin.saveSettings();
				});
			});

		containerEl.createEl("h2", { text: "Custom soundscapes" });
		containerEl.createEl("p", {
			text: "Custom soundscapes allow you to create your own playlists of youtube videos that can be selected as a soundscape.",
		});

		this.plugin.settings.customSoundscapes.forEach(
			(customSoundscape, index) => {
				new Setting(containerEl)
					.setName(customSoundscape.name)
					.setDesc(`${customSoundscape.tracks.length} tracks`)
					.addButton((component) => {
						component.setButtonText("Edit");

						component.onClick(() => {
							new EditCustomSoundscapeModal(
								this.plugin,
								// Gross way to deep clone the object
								JSON.parse(JSON.stringify(customSoundscape)),
								(
									modifiedCustomSoundscape: CustomSoundscape
								) => {
									this.plugin.settings.customSoundscapes[
										index
									] = modifiedCustomSoundscape;
									this.plugin.saveSettings();
									this.display();
								}
							).open();
						});
					})
					.addButton((component) => {
						component.setButtonText("Remove");
						component.setClass("mod-warning");

						component.onClick(() => {
							new ConfirmModal(
								this.plugin.app,
								() => {
									this.plugin.settings.customSoundscapes.splice(
										index,
										1
									);

									if (
										this.plugin.settings.soundscape ===
										`${SOUNDSCAPE_TYPE.CUSTOM}_${customSoundscape.id}`
									) {
										this.plugin.settings.soundscape =
											"lofi";
										this.plugin.onSoundscapeChange();
									}

									this.plugin.saveSettings();
									this.display();
								},
								"Remove custom soundscape",
								`This will remove your custom soundscape "${customSoundscape.name}". Are you sure?`,
								"Remove"
							).open();
						});
					});
			}
		);

		new Setting(containerEl).addButton((component) => {
			component
				.setButtonText("Add custom soundscape")
				.setCta()
				.onClick(() => {
					new EditCustomSoundscapeModal(
						this.plugin,
						{ id: uuidv4(), name: "", tracks: [] },
						(customSoundscape: CustomSoundscape) => {
							this.plugin.settings.customSoundscapes.push(
								customSoundscape
							);
							this.plugin.saveSettings();
							this.display();
						}
					).open();
				});
		});
	}
}
