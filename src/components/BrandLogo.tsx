import React from "react";
import s from "./BrandLogo.module.scss";

type Props = {
  className?: string;
};

const BrandLogo = ({ className }: Props) => (
  <span className={[s.logo, className].filter(Boolean).join(" ")}>
    <img className={s.icon} src="/brand/icon.png" alt="Burrito" />
    <span className={s.text}>
      <span>Burrito</span>
      <span>Finder</span>
    </span>
  </span>
);

export default BrandLogo;
