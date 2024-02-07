import { Modal, Setting, setTooltip } from "obsidian";
import SoundscapesPlugin, { CustomSoundscape } from "../../main";
import ConfirmModal from "../ConfirmModal/ConfirmModal";

class EditCustomSoundscapeModal extends Modal {
	_customSoundscape: CustomSoundscape;
	_onSave: Function;

	constructor(
		plugin: SoundscapesPlugin,
		customSoundscape: CustomSoundscape,
		onSave: Function
	) {
		super(plugin.app);
		this._customSoundscape = customSoundscape;
		this._onSave = onSave;
	}

	onOpen() {
		this.display();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	display(): void {
		const { contentEl } = this;

		contentEl.empty();

		contentEl.createEl("h2", { text: "Add custom soundscape" });

		new Setting(contentEl)
			.setName("Soundscape name")
			.setDesc(`What would you like to call the soundscape?`)
			.addText((component) => {
				component.setValue(this._customSoundscape.name);

				if (component.getValue().trim() === "") {
					component.inputEl.addClass("soundscapes-validation-error");
				} else {
					component.inputEl.removeClass(
						"soundscapes-validation-error"
					);
				}

				component.onChange((value: string) => {
					this._customSoundscape.name = value;
				});

				component.inputEl.addEventListener("blur", () => {
					this.display();
				});
			});

		this._customSoundscape.tracks.forEach((track, index) => {
			new Setting(contentEl)
				.setName(`Track #${index + 1}`)
				.setHeading()
				.addButton((component) => {
					component.setButtonText("Remove track");
					component.setClass("mod-warning");

					component.onClick(() => {
						new ConfirmModal(
							this.app,
							() => {
								this._customSoundscape.tracks.splice(index, 1);
								this.display();
							},
							"Remove track",
							`This will remove "${track.name}" from your custom soundscape. Are you sure?`,
							"Remove"
						).open();
					});
				});

			new Setting(contentEl)
				.setName("Track name")
				.setDesc(`Name of the track`)
				.addText((component) => {
					component.setValue(track.name);

					if (component.getValue().trim() === "") {
						component.inputEl.addClass(
							"soundscapes-validation-error"
						);
					} else {
						component.inputEl.removeClass(
							"soundscapes-validation-error"
						);
					}

					component.onChange((value: string) => {
						this._customSoundscape.tracks[index].name = value;
					});

					component.inputEl.addEventListener("blur", () => {
						this.display();
					});
				});

			new Setting(contentEl)
				.setName("Youtube id")
				.setDesc(`Id of the Youtube video for the track`)
				.addText((component) => {
					component.setValue(track.id);

					if (component.getValue().trim() === "") {
						component.inputEl.addClass(
							"soundscapes-validation-error"
						);
					} else {
						component.inputEl.removeClass(
							"soundscapes-validation-error"
						);
					}

					component.onChange((value: string) => {
						this._customSoundscape.tracks[index].id = value;
					});

					component.inputEl.addEventListener("blur", () => {
						this.display();
					});
				});
		});

		new Setting(contentEl).addButton((component) => {
			component.setButtonText("Add new track").onClick(() => {
				this._customSoundscape.tracks.push({
					name: "",
					id: "",
				});
				this.display();
			});
		});

		new Setting(contentEl).addButton((component) => {
			component.setButtonText("Save custom soundscape");

			if (
				this._customSoundscape.name.trim() === "" ||
				this._customSoundscape.tracks.some(
					(track) =>
						track.name.trim() === "" || track.id.trim() === ""
				)
			) {
				component.setDisabled(true);
				component.setClass("soundscapes-button-disabled");
			} else {
				component.setCta().onClick(() => {
					this._onSave(this._customSoundscape);
					this.close();
				});
			}
		});
	}
}

export default EditCustomSoundscapeModal;
