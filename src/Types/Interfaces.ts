import { PLAYER_STATE, SOUNDSCAPE_TYPE } from "./Enums";

export interface CustomSoundscape {
	id: string;
	name: string;
	tracks: CustomSoundscapeTrack[];
}

export interface CustomSoundscapeTrack {
	name: string;
	id: string;
}

export interface Soundscape {
	id: string;
	name: string;
	nowPlayingText: string;
	isLiveVideo: boolean;
	youtubeId: string;
	type: SOUNDSCAPE_TYPE;
}

// Documentation: https://developers.google.com/youtube/iframe_api_reference
export interface Player {
	playVideo(): void;
	pauseVideo(): void;
	seekTo(position: number): void;
	getDuration(): number;
	setVolume(volume: Number): void;
	loadVideoById(options: { videoId: String | undefined }): void;
	getCurrentTime():number;
}

export interface LocalMusicFile {
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
