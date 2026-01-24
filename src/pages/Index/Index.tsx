import React from "react";
import s from "./Index.module.scss";
import Search from "../../components/Search";
import FinderLogo from "../../components/FinderLogo";
import SelectOptions from "../../components/SelectOptions";

const Index = () => (
  <div className={s.container}>
    <div className={s.homeHeader}>
      <SelectOptions variant="header" />
    </div>
    <div className={s.content}>
      <div className={s.logo}>
        <FinderLogo variant="hero" />
      </div>
      <Search className={s.search} />
    </div>
  </div>
);

export default Index;
