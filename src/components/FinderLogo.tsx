import React from "react";
import s from "./FinderLogo.module.scss";

type Props = {
  className?: string;
  variant?: "default" | "hero";
};

const FinderLogo = ({ className, variant = "default" }: Props) => (
  <span
    className={[s.logo, variant === "hero" ? s.hero : "", className]
      .filter(Boolean)
      .join(" ")}
  >
    <img className={s.icon} src="/brand/icon.png" alt="Burrito" />
    <span className={s.text} aria-label="Burrito Finder">
      <span className={s.burrito}>Burrito</span>
      <span className={s.finder}>Finder</span>
    </span>
  </span>
);

export default FinderLogo;
