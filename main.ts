import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	debounce,
	setIcon,
} from "obsidian";

interface Soundscape {
	id: string;
	name: string;
	nowPlayingText: string;
	isLiveVideo: boolean;
	youtubeId: string;
}

const SOUNDSCAPES: Record<string, Soundscape> = {
	lofi: {
		id: "lofi",
		name: "Lofi beats",
		nowPlayingText: "Lofi beats",
		isLiveVideo: true,
		youtubeId: "jfKfPfyJRdk",
	},
	spa: {
		id: "spa",
		name: "Spa atmosphere",
		nowPlayingText: "Spa atmosphere",
		isLiveVideo: true,
		youtubeId: "luxiL4SQVVE",
	},
	sims: {
		id: "sims",
		name: "The Sims complete soundtrack",
		nowPlayingText: "The Sims complete soundtrack",
		isLiveVideo: false,
		youtubeId: "wKnkQdsITUE",
	},
	thunder: {
		id: "thunder",
		name: "Thunderstorm",
		nowPlayingText: "Thunderstorm",
		isLiveVideo: false,
		youtubeId: "nDq6TstdEi8",
	},
	fire: {
		id: "fire",
		name: "Cozy fireplace",
		nowPlayingText: "Cozy fireplace",
		isLiveVideo: false,
		youtubeId: "rCYzRXLWcIg",
	},
	birds: {
		id: "birds",
		name: "Birds chirping",
		nowPlayingText: "Birds chirping",
		isLiveVideo: false,
		youtubeId: "mFjU4JuJgnM",
	},
	ocean: {
		id: "ocean",
		name: "Ocean waves",
		nowPlayingText: "Ocean waves",
		isLiveVideo: false,
		youtubeId: "bn9F19Hi1Lk",
	},
	jazz: {
		id: "jazz",
		name: "Relaxing jazz",
		nowPlayingText: "Relaxing jazz",
		isLiveVideo: false,
		youtubeId: "tNvh2w8lTes",
	},
	coffeeshop: {
		id: "coffeeshop",
		name: "Coffee shop ambience",
		nowPlayingText: "Coffee shop ambience",
		isLiveVideo: false,
		youtubeId: "uiMXGIG_DQo",
	},
	animalcrossing: {
		id: "animalcrossing",
		name: "Animal Crossing New Horizons",
		nowPlayingText: "Animal Crossing New Horizons",
		isLiveVideo: false,
		youtubeId: "zru-TLye9jo",
	},
	yakuzabar: {
		id: "yakuzabar",
		name: "Yakuza/Like a Dragon bar ambience",
		nowPlayingText: "Yakuza bar ambience",
		isLiveVideo: false,
		youtubeId: "Q0GtyZbHJDM",
	},
	nintendo: {
		id: "nintendo",
		name: "Calm Nintendo music",
		nowPlayingText: "Calm Nintendo music",
		isLiveVideo: false,
		youtubeId: "sA0qrPOMy2Y",
	},
};

// Documentation: https://developers.google.com/youtube/iframe_api_reference
interface Player {
	playVideo(): void;
	pauseVideo(): void;
	seekTo(position: number): void;
	getDuration(): number;
	setVolume(volume: Number): void;
	loadVideoById(options: { videoId: String }): void;
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
}

const DEFAULT_SETTINGS: SoundscapesPluginSettings = {
	soundscape: "lofi",
	volume: 25,
	autoplay: false,
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
	nowPlaying: HTMLDivElement;
	volumeMutedIcon: HTMLDivElement;
	volumeLowIcon: HTMLDivElement;
	volumeHighIcon: HTMLDivElement;
	volumeSlider: HTMLInputElement;
	debouncedSaveSettings: Function;

	async onload() {
		await this.loadSettings();
		this.debouncedSaveSettings = debounce(this.saveSettings, 500, true);

		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.addClass("soundscapesroot");
		this.createPlayer();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SoundscapesSettingsTab(this.app, this));
	}

	onunload() {}

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
				this.onSoundscapeChange(); // Loop videos once they end
		}
	}

	/**
	 * Create all the UI elements
	 */
	createControls() {
		this.playButton = this.statusBarItem.createEl("button", {});
		setIcon(this.playButton, "play");
		this.playButton.onclick = () => {
			// When it's a live video, attempt to jump to the "live" portion
			if (SOUNDSCAPES[this.settings.soundscape].isLiveVideo) {
				this.player.seekTo(this.player.getDuration());
			}
			this.player.playVideo();
		};

		this.pauseButton = this.statusBarItem.createEl("button", {});
		setIcon(this.pauseButton, "pause");
		this.pauseButton.onclick = () => this.player.pauseVideo();

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
		console.log("saving...");
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

				component.setValue(this.plugin.settings.soundscape);

				component.onChange((value: string) => {
					this.plugin.settings.soundscape = value;
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
	}
}
