import { SOUNDSCAPE_TYPE } from "./Types/Enums";
import { Soundscape } from "./Types/Interfaces";

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
	vtmbloodlines: {
		id: "vtmbloodlines",
		name: "Vampire: The Masquerade – Bloodlines",
		nowPlayingText: "VTM - Bloodlines ambience",
		isLiveVideo: false,
		youtubeId: "pCZxb43L_Ag",
		type: SOUNDSCAPE_TYPE.STANDARD,
	},
	chillsynth: {
		id: "chillsynth",
		name: "ChillSynth FM",
		nowPlayingText: "ChillSynth FM",
		isLiveVideo: true,
		youtubeId: "UedTcufyrHc",
		type: SOUNDSCAPE_TYPE.STANDARD,
	},
};

export default SOUNDSCAPES;
