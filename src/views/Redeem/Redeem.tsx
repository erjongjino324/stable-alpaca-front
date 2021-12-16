import { BigNumber } from '@ethersproject/bignumber';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import { useHistory } from 'react-router-dom';
import SlippageControlButton from 'src/components/SlippageControl';
import Spacer from 'src/components/Spacer';
import useQuery from 'src/hooks/useQuery';
import ButtonSelectCollateral from '../../components/ButtonSelectCollateral';
import Card from '../../components/Card/Card';
import CardBody from '../../components/CardBody';
import {
  FormAction,
  FormButtonsContainer,
  FormHeader,
  FormHeaderContainer,
  FormOutput,
  FormRow,
  FormSeparator,
  FormTitle,
  FormToken,
} from '../../components/Form';
import Number from '../../components/Number';
import TokenInput from '../../components/TokenInput';
import TokenSymbol from '../../components/TokenSymbol';
import useIronBankInfo from '../../hooks/useIronBankInfo';
import useModalWithFC from '../../hooks/useModalWithFC';
import { useGetSlippageTolerance } from '../../state/application/hooks';
import theme from '../../theme';
import ButtonRedeem from './components/ButtonRedeem';
import CollectionRedemption from './components/CollectionRedemption';
import { RedeemContentLoader } from './components/RedeemContentLoader';
import RedeemFooter from './components/RedeemFooter';
import TransactionConfirmationModal from './components/TransactionConfirmationModal';
import ERC20 from "../../iron-bank/ERC20";
import { abi as usdcAbi } from '../../iron-bank/deployments/mainnet/USDC.json';
import { abi as ironAbi } from '../../iron-bank/deployments/mainnet/Iron.json';
import { abi as titanAbi } from '../../iron-bank/deployments/mainnet/Titan.json';
import { abi as poolAbi } from '../../iron-bank/deployments/mainnet/Pool.json';
import {useWeb3React} from "@web3-react/core";
import config from "../../config";
import {useTokensInfo} from "../../api/backend-api";

const Tokens = ['iron', 'titan'];

const Redeem: React.FC = () => {
  const { library: provider, chainId, account } = useWeb3React();
  const { tokens } = config;
  const info = useIronBankInfo();
  const [collateralPrice, setCollateralPrice] = useState<BigNumber>();
  const [poolCollateralBalance, setPoolCollateralBalance] = useState(BigNumber.from(0));
  const [sharePrice, setSharePrice] = useState<BigNumber>(BigNumber.from(0));
  const [dollarAmount, setDollarAmount] = useState(BigNumber.from(0));
  const [dollarPrice, setDollarPrice] = useState<BigNumber>(BigNumber.from(0));
  const [minOutputCollateralAmount, setMinOutputCollateralAmount] = useState(BigNumber.from(0));
  const [minOutputShareAmount, setMinOutputShareAmount] = useState(BigNumber.from(0));
  const [redemptionFeeValue, setRedemptionFeeValue] = useState(BigNumber.from(0));

  const slippage = useGetSlippageTolerance();
  const [collateralBalance, setCollateralBalance] = useState(BigNumber.from(0));
  const [dollarBalance, setDollarBalance] = useState(BigNumber.from(0));
  const [shareBalance, setShareBalance] = useState(BigNumber.from(0));
  const tokensInfo = useTokensInfo(Tokens);
  const usdcContract = new ERC20(tokens.USDC, usdcAbi, provider?.getSigner(), '');
  const ironContract = new ERC20(tokens.IRON, ironAbi, provider?.getSigner(), '');
  const titanContract = new ERC20(tokens.TITAN, titanAbi, provider?.getSigner(), '');
  const poolContract = new ERC20(tokens.POOL, poolAbi, provider?.getSigner(), '');

  const refInputDollar = useRef(null);
  const { showModal, hideModal } = useModalWithFC();
  const history = useHistory();
  const query = useQuery();

  const isFullCollateralized = useMemo(() => info?.effectiveCollateralRatio.gte(10 ** 6), [
    info?.effectiveCollateralRatio,
  ]);

  const isExceededBalance = useMemo(() => {
    if (dollarBalance && dollarAmount) {
      return dollarAmount.gt(dollarBalance);
    }
    return false;
  }, [dollarBalance, dollarAmount]);

  const onRedeem = useCallback(() => {
    showModal(TransactionConfirmationModal, {
      dollarAmount,
      minOutputCollateralAmount,
      minOutputShareAmount,
      collateralPrice,
      sharePrice,
      redemptionFee: info?.redemptionFee,
      slippage,
      onDismiss: hideModal,
      onConfirmed: onApproveAndRedeem
    });
  }, [
    showModal,
    dollarAmount,
    minOutputCollateralAmount,
    minOutputShareAmount,
    collateralPrice,
    sharePrice,
    info?.redemptionFee,
    slippage,
    hideModal,
  ]);

  const onPoolSelected = useCallback(
    (_pool?: string) => {
      if (_pool) {
        history.push(`/bank?action=redeem&pool=${_pool}`);
      }
    },
    [history],
  );

  const updateDollarAmount = useCallback((amount: BigNumber) => {
    const collateralAmount = amount.div(10).mul(9).mul(dollarPrice).div(collateralPrice)
    const shareAmount = amount.div(10).mul(dollarPrice).div(sharePrice)
    setDollarAmount(amount)
    setMinOutputCollateralAmount(collateralAmount)
    setMinOutputShareAmount(shareAmount)
  }, [collateralPrice, sharePrice, dollarPrice]);

  useEffect(() => {
    if (dollarAmount) {
      setRedemptionFeeValue(dollarAmount.mul(info?.redemptionFee).div(BigNumber.from(1e6)))
    }
  }, [dollarAmount]);

  const onApproveAndRedeem = async () => {
    await ironContract.approve(tokens.POOL, dollarAmount);
    await poolContract.mint(dollarAmount, minOutputShareAmount, minOutputCollateralAmount);
    hideModal();
  }

  useEffect(() => {
    setSharePrice(tokensInfo?.titan.price);
    setDollarPrice(tokensInfo?.iron.price);
    setCollateralPrice(BigNumber.from(1000000));
  }, [tokensInfo]);

  useEffect(() => {
    const auxilliaryFn = async () => {
      if (chainId) {
        setCollateralBalance(await usdcContract.balanceOf(account));
        setShareBalance(await titanContract.balanceOf(account));
        setDollarBalance(await ironContract.balanceOf(account));
      }
    };
    auxilliaryFn();
  }, [chainId]);

  return !info ? (
    <RedeemContentLoader />
  ) : (
    <>
      {/*<CollectionRedemption />*/}
      <Spacer />
      <Card
        width="450px"
        animationDuration={0.3}
        background={'linear-gradient(to right,rgb(34 59 231 / 9%),rgb(52 67 249 / 15%))'}
      >
        <CardBody>
          <FormHeader>
            <FormHeaderContainer>
              <FormTitle>Redeem</FormTitle>
              <FormAction>
                <SlippageControlButton />
              </FormAction>
            </FormHeaderContainer>
          </FormHeader>

          <FormRow>
            <div className="row-header">
              <h6>Input</h6>
              {dollarBalance && (
                <div style={{ marginLeft: 'auto ' }}>
                  Balance:{' '}
                  <Number value={dollarBalance} decimals={6} precision={2} keepZeros={false} />
                </div>
              )}
            </div>
            <div className="row-input">
              <TokenInput
                ref={refInputDollar}
                token={'IRON'}
                hasError={isExceededBalance}
                decimals={6}
                precision={6}
                onChange={updateDollarAmount}
                value={dollarAmount}
              />
              <FormToken>
                <TokenSymbol size={32} symbol="IRON"></TokenSymbol>
                <span>IRON</span>
              </FormToken>
            </div>
          </FormRow>

          <FormSeparator>
            <i className="fas fa-arrow-down" color={theme.color.primary.main} />
          </FormSeparator>

          <FormRow>
            <div className="row-header">
              <h6>
                Output USDC &middot;{' '}
                <Number
                  percentage={true}
                  value={info?.effectiveCollateralRatio}
                  decimals={6}
                  precision={2}
                  keepZeros={false}
                />
                %
              </h6>
              <div style={{ marginLeft: 'auto ' }}>
                Balance: <Number value={collateralBalance} decimals={6} precision={6} />
              </div>
            </div>
            <div className="row-input">
              <FormOutput>
                <Number value={minOutputCollateralAmount} decimals={6} precision={6} />
              </FormOutput>
              <FormToken>
                <ButtonSelectCollateral
                  poolAddress={query?.get('pool')}
                  onSelected={onPoolSelected}
                />
              </FormToken>
            </div>
          </FormRow>

          {!isFullCollateralized && (
            <FormSeparator>
              <i className="fas fa-plus" color={theme.color.grey[500]}></i>
            </FormSeparator>
          )}

          {!isFullCollateralized && (
            <FormRow>
              <div className="row-header">
                <h6>
                  Output TITAN &middot;{' '}
                  <Number
                    percentage={true}
                    value={BigNumber.from(1e6).sub(info?.effectiveCollateralRatio)}
                    decimals={6}
                    precision={6}
                  />
                  %
                </h6>
                <div style={{ marginLeft: 'auto ' }}>
                  Balance: <Number value={shareBalance} decimals={6} precision={6} />
                </div>
              </div>
              <div className="row-input">
                <FormOutput>
                  <Number value={minOutputShareAmount} decimals={6} precision={6} />
                </FormOutput>
                <FormToken>
                  <TokenSymbol size={32} symbol={'TITAN'}></TokenSymbol>
                  <span>TITAN</span>
                </FormToken>
              </div>
            </FormRow>
          )}
          <FormButtonsContainer>
            <ButtonRedeem
              collateralBalance={poolCollateralBalance}
              dollarAmount={dollarAmount}
              isExceededDollarBalance={isExceededBalance}
              paused={false}
              redeem={onRedeem}
              minOutputAmount={minOutputCollateralAmount}
            />
          </FormButtonsContainer>
        </CardBody>
      </Card>
      <RedeemFooter
        collateralPrice={collateralPrice}
        collateralBalance={poolCollateralBalance}
        redeemFeeValue={redemptionFeeValue}
        tokensInfo={tokensInfo}
      />
    </>
  );
};

export default Redeem;
