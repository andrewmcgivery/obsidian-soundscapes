import React from "react";
import { App, FileView, ItemView, WorkspaceLeaf } from "obsidian";
import { Root, createRoot } from "react-dom/client";
import ReactApp from "../React/Components/App/App";
import { obsidianPluginContext } from "../React/Context/ObsidianPluginContext";
import Observable from "../src/Utils/Observable";
import SoundscapesPlugin from "../main";

export const SOUNDSCAPES_REACT_VIEW = "soundscapes-react-view";

export class ReactView extends ItemView {
	root: Root | null = null;
	app: App;
	plugin: SoundscapesPlugin;
	settingsObservable: Observable;
	localPlayerStateObservable: Observable;

	constructor(
		plugin: SoundscapesPlugin,
		settingsObservable: Observable,
		localPlayerStateObservable: Observable,
		leaf: WorkspaceLeaf
	) {
		super(leaf);
		this.app = plugin.app;
		this.plugin = plugin;
		this.settingsObservable = settingsObservable;
		this.localPlayerStateObservable = localPlayerStateObservable;
	}

	getViewType() {
		return SOUNDSCAPES_REACT_VIEW;
	}

	getDisplayText() {
		return "Soundscapes: My Music";
	}

	getIcon() {
		return "music";
	}

	async onOpen() {
		this.root = createRoot(this.containerEl.children[1]);
		this.root.render(
			<obsidianPluginContext.Provider
				value={{
					app: this.app,
					plugin: this.plugin,
					settingsObservable: this.settingsObservable,
					localPlayerStateObservable: this.localPlayerStateObservable,
				}}
			>
				<ReactApp />
			</obsidianPluginContext.Provider>
		);
		this.containerEl.addClass("soundscapesmymusic");
	}

	async onClose() {
		this.root?.unmount();
	}
}
