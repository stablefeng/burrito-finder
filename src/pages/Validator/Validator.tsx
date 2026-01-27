import { useState } from "react";
import { useParams } from "react-router-dom";
import BigNumber from "bignumber.js";
import Card from "../../components/Card";
import Page from "../../components/Page";
import Loading from "../../components/Loading";
import NotFound from "../../components/NotFound";
import { useCommission, useRewards } from "../../queries/distribution";
import { useValidator } from "../../queries/staking";
import Informations from "./Informations";
import Header from "./Header";
import Rewards from "./Rewards";
import s from "./Validator.module.scss";

const Validator = () => {
  const { address = "" } = useParams();
  const { data: validator, isLoading } = useValidator(address);
  const rewards = useRewards(address);
  const commissions = useCommission(address);
  const columnClass = "col col-6";
  const [hideLowValueRewards, setHideLowValueRewards] = useState(true);

  const filterLowValue = (list: typeof rewards) => {
    if (!list) return [];
    if (!hideLowValueRewards) return list;
    const min = new BigNumber(1e4);
    return list.filter(({ amount }) =>
      new BigNumber(amount.toString()).gte(min)
    );
  };

  return isLoading ? (
    <Loading />
  ) : validator ? (
    <Page title="Validator Details">
      <Header address={address} />

      <Card>
        <Informations address={address} />
      </Card>

      {rewards && commissions ? (
        <>
          <div className={s.rewardsHeader}>
            <h2>Rewards and commissions</h2>
            <label className={s.toggle}>
              <input
                type="checkbox"
                checked={hideLowValueRewards}
                onChange={() => setHideLowValueRewards(!hideLowValueRewards)}
              />
              <span className={s.toggleTrack} />
              <span className={s.toggleLabel}>Hide low-balance</span>
            </label>
          </div>
          <div className="row">
            <div className={columnClass}>
              <Rewards title="Rewards pool" list={filterLowValue(rewards)} />
            </div>

            <div className={columnClass}>
              <Rewards
                title="Commissions"
                list={filterLowValue(commissions.toArray())}
              />
            </div>
          </div>
        </>
      ) : null}
    </Page>
  ) : (
    <NotFound keyword={address} />
  );
};

export default Validator;
