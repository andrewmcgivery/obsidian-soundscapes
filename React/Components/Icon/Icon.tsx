import React from "react";
import { getIcon } from "obsidian";

/**
 * Given an icon name, converts a Obsidian icon to a usable SVG string and embeds it into a span.
 * @returns
 */
const Icon = ({ name }: { name: string }) => {
	const iconText = new XMLSerializer().serializeToString(
		getIcon(name) || new Node()
	);

	return (
		<span
			className="lucide-icon"
			dangerouslySetInnerHTML={{
				__html: iconText,
			}}
		></span>
	);
};

export default Icon;
