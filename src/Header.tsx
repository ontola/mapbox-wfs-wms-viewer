import "./Header.css";
import React, { useState } from "react";
import { InfoPage } from "./InfoPage";
import { Cross1Icon } from "@radix-ui/react-icons";
import { ChatBubbleIcon, InfoCircledIcon } from "@radix-ui/react-icons";

export function Header() {
  const [showInfoPage, setShowInfoPage] = useState(false);

  if (showInfoPage) {
    return (
      <div className="infopage">
        <div className="infopage__buttons">
          <button title="Sluiten" onClick={() => setShowInfoPage(false)}>
            <Cross1Icon />
          </button>
        </div>
        <InfoPage />
      </div>
    );
  }

  return (
    <div className="app-header">
      <div className="header">
        <h2 className="logo">Gebouwenpaspoort</h2>
        <div className="header--buttons">
          <a
            className="button"
            rel="noopener noreferrer"
            target="_blank"
            id="feedback-button"
            href="https://forms.gle/nxGbtVxoCiYgB83S6"
            title="Geef feedback over deze app."
          >
            <ChatBubbleIcon />
          </a>
          <button
            className="button"
            title="Toon informatie over deze app."
            onClick={() => setShowInfoPage(!showInfoPage)}
          >
            <InfoCircledIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
