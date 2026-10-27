import React from "react";
import {
  FaTelegram,
  FaYoutube,
  FaTwitter,
  FaGithub,
  FaDiscord,
  FaLinkedin,
} from "react-icons/fa";

interface SocialIconProps {
  platform:
    | "telegram"
    | "youtube"
    | "twitter"
    | "github"
    | "discord"
    | "linkedin";
  username: string;
  size?: number;
  color?: string;
}

const SocialIcon: React.FC<SocialIconProps> = ({
  platform,
  username,
  size = 28,
  color = "white",
}) => {
  const getPlatformConfig = (platform: string) => {
    const configs = {
      telegram: {
        icon: FaTelegram,
        url: `https://t.me/${username}`,
        label: "Telegram",
      },
      youtube: {
        icon: FaYoutube,
        url: username.startsWith("http")
          ? username
          : `https://www.youtube.com/c/${username}`,
        label: "YouTube",
      },
      twitter: {
        icon: FaTwitter,
        url: `https://twitter.com/${username}`,
        label: "Twitter",
      },
      github: {
        icon: FaGithub,
        url: `https://github.com/${username}`,
        label: "GitHub",
      },
      discord: {
        icon: FaDiscord,
        url: username.startsWith("http")
          ? username
          : `https://discord.com/users/${username}`,
        label: "Discord",
      },
      linkedin: {
        icon: FaLinkedin,
        url: username.startsWith("http")
          ? username
          : `https://www.linkedin.com/in/${username}`,
        label: "LinkedIn",
      },
    };

    return configs[platform as keyof typeof configs];
  };

  const config = getPlatformConfig(platform);

  if (!config) {
    console.warn(`Unknown platform: ${platform}`);
    return null;
  }

  const IconComponent = config.icon;

  return (
    <a
      aria-label={config.label}
      href={config.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <IconComponent size={size} color={color} />
    </a>
  );
};

export default SocialIcon;
