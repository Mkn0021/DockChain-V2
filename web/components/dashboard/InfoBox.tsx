import React from "react";

interface InfoBoxProps {
  title?: string;
  items: string[];
  className?: string;
}

const InfoBox: React.FC<InfoBoxProps> = ({ title, items, className = "" }) => (
  <div
    className={`bg-blue-50 rounded-lg px-4 py-6 border border-blue-200 ${className}`}
  >
    {title && <h4 className="text-blue-900 m-0 p-0 mb-2">{title}</h4>}
    <ul className="text-sm text-blue-800 space-y-2">
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start space-x-2">
          <span className="text-primary">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default InfoBox;
