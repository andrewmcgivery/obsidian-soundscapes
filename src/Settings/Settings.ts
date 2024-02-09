import SoundscapesPlugin from "main";
import { App, PluginSettingTab, Setting } from "obsidian";
import { v4 as uuidv4 } from "uuid";
import ConfirmModal from "src/ConfirmModal/ConfirmModal";
import EditCustomSoundscapeModal from "src/EditCustomSoundscapeModal/EditCustomSoundscapeModal";
import SOUNDSCAPES from "src/Soundscapes";
import { SOUNDSCAPE_TYPE } from "src/Types/Enums";
import { CustomSoundscape, LocalMusicFile } from "src/Types/Interfaces";

export interface SoundscapesPluginSettings {
	soundscape: string;
	volume: number;
	autoplay: boolean;
	customSoundscapes: CustomSoundscape[];
	myMusicIndex: LocalMusicFile[];
}

export const DEFAULT_SETTINGS: SoundscapesPluginSettings = {
	soundscape: "lofi",
	volume: 25,
	autoplay: false,
	customSoundscapes: [],
	myMusicIndex: [],
};

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
