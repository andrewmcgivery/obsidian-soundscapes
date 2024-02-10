import React, { useEffect, useState } from "react";
import { useObsidianPluginContext } from "../../Context/ObsidianPluginContext";
import Icon from "../Icon/Icon";
import Search from "../Search/Search";
import secondsToMinutesAndSeconds from "../../Utils/secondsToMinutesAndSeconds";
import { LocalPlayerState } from "src/Types/Interfaces";
import { PLAYER_STATE } from "src/Types/Enums";

const Header = () => {
	const { localPlayerStateObservable, plugin } = useObsidianPluginContext();
	const [localPlayerState, setLocalPlayerState] = useState<LocalPlayerState>(
		localPlayerStateObservable?.getValue()
	);

	/**
	 * Subscribe to local player state from Obsidian
	 */
	useEffect(() => {
		const unsubscribe = localPlayerStateObservable?.onChange(
			(newState: LocalPlayerState) => {
				setLocalPlayerState(newState);
			}
		);

		return () => {
			unsubscribe?.();
		};
	}, [setLocalPlayerState]);

	return (
		<div className="soundscapesmymusic-header">
			<div className="soundscapesmymusic-left">
				<div className="soundscapesmymusic-left-controls">
					<button
						className="soundscapesmymusic-left-controls-button"
						onClick={() => plugin?.previous()}
					>
						<Icon name="skip-back" />
					</button>
					{localPlayerState.playerState === PLAYER_STATE.PAUSED && (
						<button
							className="soundscapesmymusic-left-controls-button soundscapesmymusic-left-controls-button--large"
							onClick={() => plugin?.play()}
						>
							<Icon name="play" />
						</button>
					)}
					{localPlayerState.playerState === PLAYER_STATE.PLAYING && (
						<button
							className="soundscapesmymusic-left-controls-button soundscapesmymusic-left-controls-button--large"
							onClick={() => plugin?.pause()}
						>
							<Icon name="pause" />
						</button>
					)}
					<button
						className="soundscapesmymusic-left-controls-button"
						onClick={() => plugin?.next()}
					>
						<Icon name="skip-forward" />
					</button>
				</div>
			</div>
			<div className="soundscapesmymusic-volume">
				<input
					type="range"
					min="0"
					max="100"
					value={plugin?.settings.volume}
					onChange={(e) => plugin?.onVolumeChange(e)}
				/>
			</div>
			<div className="soundscapesmymusic-middle">
				{localPlayerState.currentTrack && (
					<>
						<div className="soundscapesmymusic-middle-line1">
							<div className="soundscapesmymusic-middle-line1-left">
								<button
									className={`soundscapesmymusic-middle-line1-button ${
										plugin?.settings.myMusicShuffle &&
										"soundscapesmymusic-middle-line1-button--active"
									}`}
									onClick={() => {
										plugin?.toggleShuffle();
									}}
								>
									<Icon name="shuffle" />
								</button>
							</div>
							<div className="soundscapesmymusic-middle-line1-title">
								{localPlayerState.currentTrack.title ||
									localPlayerState.currentTrack.fileName}
							</div>
							<div className="soundscapesmymusic-middle-line1-right"></div>
						</div>
						<div className="soundscapesmymusic-middle-line2">
							<div className="soundscapesmymusic-middle-line2-left">
								{secondsToMinutesAndSeconds(
									localPlayerState.currentTime || 0
								)}
							</div>
							<div className="soundscapesmymusic-middle-line2-artist">
								{localPlayerState.currentTrack.artist}
							</div>
							<div className="soundscapesmymusic-middle-line2-right">
								-
								{secondsToMinutesAndSeconds(
									(localPlayerState.currentTrack.duration ||
										0) - (localPlayerState.currentTime || 0)
								)}
							</div>
						</div>
						<input
							type="range"
							min="0"
							max="100"
							step="0.1"
							value={
								((localPlayerState.currentTime || 0) /
									(localPlayerState.currentTrack.duration ||
										0)) *
								100
							}
							onChange={(e) =>
								plugin?.seek(
									(parseInt(e.target.value) / 100) *
										(localPlayerState.currentTrack
											?.duration || 0)
								)
							}
							className="soundscapesmymusic-middle-seekbar"
						/>
					</>
				)}
			</div>
			<div className="soundscapesmymusic-right">
				<Search />
			</div>
		</div>
	);
};

export default Header;
