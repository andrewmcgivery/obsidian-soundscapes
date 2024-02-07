import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	debounce,
	setIcon,
	requestUrl,
	Notice,
} from "obsidian";
import { v4 as uuidv4 } from "uuid";
import EditCustomSoundscapeModal from "src/EditCustomSoundscapeModal/EditCustomSoundscapeModal";
import ConfirmModal from "src/ConfirmModal/ConfirmModal";

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
}

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
enum PLAYER_STATE {
	UNSTARTED = -1,
	ENDED = 0,
	PLAYING = 1,
	PAUSED = 2,
	BUFFERING = 3,
	VIDEO_CUED = 5,
}

interface SoundscapesPluginSettings {
	soundscape: string;
	volume: number;
	autoplay: boolean;
	customSoundscapes: CustomSoundscape[];
}

const DEFAULT_SETTINGS: SoundscapesPluginSettings = {
	soundscape: "lofi",
	volume: 25,
	autoplay: false,
	customSoundscapes: [],
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
	player: Player;
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
		this.debouncedSaveSettings = debounce(this.saveSettings, 500, true);

		this.versionCheck();

		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.addClass("soundscapesroot");
		this.createPlayer();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SoundscapesSettingsTab(this.app, this));
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
					onStateChange: this.onStateChange.bind(this),
				},
			});
		};
	}

	/**
	 * Once the player is ready, create the controls and play some music! (or not if autoplay is disabled)
	 */
	onPlayerReady() {
		this.createControls();
		this.onSoundscapeChange();
		if (!this.settings.autoplay) {
			this.player.pauseVideo();
		}
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
				break;
			case PLAYER_STATE.PAUSED:
				this.playButton.show();
				this.pauseButton.hide();
				break;
			case PLAYER_STATE.ENDED:
				// When it's a playlist-type soundscape, go to the next track, or wrap back around to the first track if at the end
				if (this.soundscapeType === SOUNDSCAPE_TYPE.CUSTOM) {
					if (customSoundscape?.tracks[this.currentTrackIndex + 1]) {
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
		this.previousButton.onclick = () => {
			const customSoundscape = this.getCurrentCustomSoundscape();

			if (this.currentTrackIndex === 0) {
				this.currentTrackIndex =
					(customSoundscape?.tracks.length || 1) - 1;
			} else {
				this.currentTrackIndex--;
			}
			this.onSoundscapeChange();
		};

		this.playButton = this.statusBarItem.createEl("button", {});
		setIcon(this.playButton, "play");
		this.playButton.onclick = () => {
			// When it's a live video, attempt to jump to the "live" portion
			if (
				this.soundscapeType === SOUNDSCAPE_TYPE.STANDARD &&
				SOUNDSCAPES[this.settings.soundscape].isLiveVideo
			) {
				this.player.seekTo(this.player.getDuration());
			}
			this.player.playVideo();
		};

		this.pauseButton = this.statusBarItem.createEl("button", {});
		setIcon(this.pauseButton, "pause");
		this.pauseButton.onclick = () => this.player.pauseVideo();

		this.nextButton = this.statusBarItem.createEl("button", {
			cls: "soundscapesroot-nextbutton",
		});
		setIcon(this.nextButton, "skip-forward");
		this.nextButton.onclick = () => {
			const customSoundscape = this.getCurrentCustomSoundscape();

			if (customSoundscape?.tracks[this.currentTrackIndex + 1]) {
				this.currentTrackIndex++;
			} else {
				this.currentTrackIndex = 0;
			}
			this.onSoundscapeChange();
		};

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
		this.onVolumeChange();

		this.volumeSlider.addEventListener(
			"input",
			this.onVolumeChange.bind(this)
		);
	}

	/**
	 * When we change the volume (usually via the slider), update the player volume, the UI, and save the current volume to settings
	 */
	onVolumeChange() {
		const volume = parseInt(this.volumeSlider.value);
		this.player.setVolume(volume);

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
		this.debouncedSaveSettings();
	}

	/**
	 * Play the selected soundscape!
	 */
	onSoundscapeChange() {
		if (this.settings.soundscape.startsWith(`${SOUNDSCAPE_TYPE.CUSTOM}_`)) {
			this.soundscapeType = SOUNDSCAPE_TYPE.CUSTOM;
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
		await this.saveData(this.settings);
	}
}

class SoundscapesSettingsTab extends PluginSettingTab {
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
