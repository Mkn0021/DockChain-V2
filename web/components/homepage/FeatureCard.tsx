import Image from "next/image";
import React from "react";

interface FeatureCardProps {
  imageSrc: string;
  imageAlt: string;
  title: string;
  description: string;
  className?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  imageSrc,
  imageAlt,
  title,
  description,
  className = "",
}) => {
  return (
    <div className={`flex flex-col h-full ${className}`.trim()}>
      <div className="bg-gradient-to-t from-black via-[#081E83] to-[#0F2CB7] w-full aspect-square p-4 relative mb-4">
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={300}
          height={200}
          className="w-full h-full object-contain"
        />
      </div>
      <div className="flex-grow flex flex-col">
        <h3 className="mb-2">{title}</h3>
        <p className="px-4 text-center break-all hyphens-auto leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};
