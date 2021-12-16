import React from 'react';
import Amount from '../../../components/Amount';
import Number from '../../../components/Number';
import {
  CardFooter,
  CardFooterRow,
  CardFooterRowLeft,
  CardFooterRowRight,
  CardUnit,
} from '../../../components/CardFooter';
import { BigNumber } from '@ethersproject/bignumber';
import Spacer from '../../../components/Spacer';
import Label from '../../../components/Label';
import { useGetSlippageTolerance } from 'src/state/application/hooks';
import useIronBankInfo from 'src/hooks/useIronBankInfo';

interface RedeemFooterProps {
  collateralPrice: BigNumber;
  collateralBalance: BigNumber;
  redeemFeeValue?: BigNumber;
  tokensInfo:
    Record<string,
      {
        price: BigNumber;
        totalSupply: BigNumber;
        marketCap: BigNumber;
      }
      >;
}
const RedeemFooter: React.FC<RedeemFooterProps> = ({
  collateralPrice,
  collateralBalance,
  redeemFeeValue,
  tokensInfo
}) => {
  const slippage = useGetSlippageTolerance();
  const info = useIronBankInfo();

  const isFullCollateralized = false;

  return (
    <CardFooter width="400px">
      <CardFooterRow>
        <CardFooterRowLeft>Redemption fee</CardFooterRowLeft>
        <CardFooterRowRight>
          {!!redeemFeeValue && (
            <>
              <Spacer size="xs" />
              =
              <Spacer size="xs" />
              <Amount
                value={redeemFeeValue}
                decimals={6}
                keepZeros={false}
                precision={4}
                noUnits={true}
              />
              <Spacer size="xs" />
              <CardUnit>IRON</CardUnit>
            </>
          )}
        </CardFooterRowRight>
      </CardFooterRow>
      <CardFooterRow>
        <CardFooterRowLeft>Slippage</CardFooterRowLeft>
        <CardFooterRowRight>
          {slippage && <>{(slippage * 100).toFixed(2)}%</>}
        </CardFooterRowRight>
      </CardFooterRow>
      <>
        <CardFooterRow>
          <CardFooterRowLeft>Pool Balance</CardFooterRowLeft>
          <CardFooterRowRight>
            <Amount
              value={collateralBalance}
              decimals={6}
              noUnits={true}
              precision={2}
              keepZeros={true}
            />
            <Spacer size="sm" />
            <Label text="USDC" />
          </CardFooterRowRight>
        </CardFooterRow>
        {!!info?.effectiveCollateralRatio &&
          info?.effectiveCollateralRatio.gt(0) &&
          !!collateralPrice && (
            <CardFooterRow>
              <CardFooterRowLeft>Rates: &nbsp;</CardFooterRowLeft>
              <CardFooterRowRight>
                <div className="value">1</div>&nbsp;
                <CardUnit>USDC</CardUnit>&nbsp;=&nbsp;
                <div className="value">
                  <Number value={collateralPrice} decimals={6} precision={6} />
                </div>
                <CardUnit>USD</CardUnit>
              </CardFooterRowRight>
            </CardFooterRow>
          )}
        {!isFullCollateralized && !!tokensInfo?.titan.price && (
          <CardFooterRow>
            <CardFooterRowLeft></CardFooterRowLeft>
            <CardFooterRowRight>
              <div className="value">1</div> <CardUnit>TITAN</CardUnit>
              &nbsp;=&nbsp;
              <div className="value">
                <Number value={tokensInfo?.titan.price} decimals={6} precision={6} />
              </div>
              <CardUnit>USD</CardUnit>
            </CardFooterRowRight>
          </CardFooterRow>
        )}
      </>
    </CardFooter>
  );
};

export default RedeemFooter;
