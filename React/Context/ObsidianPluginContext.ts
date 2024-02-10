import { createContext, useContext } from "react";
import { App } from "obsidian";
import SoundscapesPlugin from "main";
import Observable from "src/Utils/Observable";

interface ObsidianPluginContext {
	app: App | null | undefined;
	plugin: SoundscapesPlugin | null | undefined;
	settingsObservable: Observable | null | undefined;
	localPlayerStateObservable: Observable | null | undefined;
}

export const obsidianPluginContext = createContext<ObsidianPluginContext>({
	app: null,
	plugin: null,
	settingsObservable: null,
	localPlayerStateObservable: null,
});

export const useObsidianPluginContext = (): ObsidianPluginContext => {
	return useContext(obsidianPluginContext);
};
