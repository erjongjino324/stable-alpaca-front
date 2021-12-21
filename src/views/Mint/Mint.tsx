import { BigNumber } from '@ethersproject/bignumber';
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import Switch from 'react-switch';
import ButtonSelectCollateral from 'src/components/ButtonSelectCollateral';
import SlippageControlButton from 'src/components/SlippageControl';
import useModalWithFC from 'src/hooks/useModalWithFC';
import useQuery from 'src/hooks/useQuery';
import styled from 'styled-components';
import Card from '../../components/Card';
import CardBody from '../../components/CardBody';
import {
  FormAction,
  FormButtonsContainer,
  FormHeader,
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
import { useGetIsZap, useGetSlippageTolerance, useSetZap } from '../../state/application/hooks';
import theme from '../../theme';
import ButtonMint from './components/ButtonMint';
import { MintContentLoader } from './components/MintContentLoader';
import MintFooter from './components/MintFooter';
import TransactionConfirmationModal from './components/TransactionConfirmationModal';
import ERC20 from '../../iron-bank/ERC20';
import { abi as usdcAbi } from '../../iron-bank/deployments/mainnet/USDC.json';
import { abi as dollarAbi } from '../../iron-bank/deployments/mainnet/Dollar.json';
import { abi as shareAbi } from '../../iron-bank/deployments/mainnet/Share.json';
import { abi as poolAbi } from '../../iron-bank/deployments/mainnet/PoolUSDC.json';
import config from 'src/config';
import { useWeb3React } from '@web3-react/core';
import { useTokensInfo } from 'src/api/backend-api';

const Tokens = ['iron', 'titan'];

const Mint: React.FC = () => {
  const { library: provider, chainId, account } = useWeb3React();
  const { tokens } = config;
  const { showModal, hideModal } = useModalWithFC();
  const slippage = useGetSlippageTolerance();
  const history = useHistory();
  const info = useIronBankInfo();
  const [collateralPrice, setCollateralPrice] = useState<BigNumber>(BigNumber.from(1e6));
  const [collateralAmount, setCollateralAmount] = useState(BigNumber.from(0));
  const [sharePrice, setSharePrice] = useState<BigNumber>(BigNumber.from(0));
  const [shareAmount, setShareAmount] = useState(BigNumber.from(0));
  const [dollarPrice, setDollarPrice] = useState<BigNumber>(BigNumber.from(0));
  const [minOutputAmount, setMinOutputAmount] = useState<BigNumber>();
  const [mintFeeValue, setMintFeeValue] = useState<BigNumber>();
  const [collateralBalance, setCollateralBalance] = useState(BigNumber.from(0));
  const [dollarBalance, setDollarBalance] = useState(BigNumber.from(0));
  const [shareBalance, setShareBalance] = useState(BigNumber.from(0));
  const isZap = useGetIsZap();
  const setIsZap = useSetZap();
  const tokensInfo = useTokensInfo(Tokens);
  const usdcContract = new ERC20(tokens.USDC, usdcAbi, provider?.getSigner(), '');
  const dollarContract = new ERC20(tokens.DOLLAR, dollarAbi, provider?.getSigner(), '');
  const shareContract = new ERC20(tokens.SHARE, shareAbi, provider?.getSigner(), '');
  const poolContract = new ERC20(tokens.POOLUSDC, poolAbi, provider?.getSigner(), '');

  const refInputCollateral = useRef(null);
  const refInputShare = useRef(null);

  const query = useQuery();

  const isFullCollaterallized = useMemo(() => info?.targetCollateralRatio.gte(10 ** 6), [info]);

  const updateCollateralAmount = useCallback((collateralAmount: BigNumber) => {
    try {
      if (!isZap) {
        const shareAmount = BigNumber.from(collateralAmount.mul(collateralPrice).div(sharePrice).toNumber()).div(9)
        const mindOutputAmount = shareAmount.mul(sharePrice).add(collateralAmount.mul(collateralPrice)).div(dollarPrice)
        setCollateralAmount(collateralAmount)
        setShareAmount(shareAmount)
        setMinOutputAmount(mindOutputAmount)
      } else {
        const mindOutputAmount = collateralAmount.mul(collateralPrice).div(dollarPrice)
        setCollateralAmount(collateralAmount)
        setShareAmount(BigNumber.from(0))
        setMinOutputAmount(mindOutputAmount)
      }
    } catch {
      console.log('BigNumber overflow error')
    }
  }, [collateralPrice, sharePrice, dollarPrice]);

  const updateShareAmount = useCallback((shareAmount: BigNumber) => {
    const collateralAmount = BigNumber.from(shareAmount.mul(sharePrice).div(collateralPrice).toNumber()).mul(9)
    const mindOutputAmount = shareAmount.mul(sharePrice).add(collateralAmount.mul(collateralPrice)).div(dollarPrice)
    setCollateralAmount(collateralAmount)
    setShareAmount(shareAmount)
    setMinOutputAmount(mindOutputAmount)
  }, [collateralPrice, sharePrice, dollarPrice]);

  useEffect(() => {
    if (minOutputAmount) {
      setMintFeeValue(minOutputAmount.mul(info?.mintingFee).div(BigNumber.from(1e6)))
    }
  }, [minOutputAmount]);

  const onMint = useCallback(() => {
    showModal(TransactionConfirmationModal, {
      dollarAmount: minOutputAmount,
      collateralAmount,
      collateralPrice,
      shareAmount,
      sharePrice,
      mintFee: info?.mintingFee,
      slippage,
      onDismiss: hideModal,
      onConfirmed: onApproveAndMint,
    });
  }, [
    showModal,
    minOutputAmount,
    collateralAmount,
    collateralPrice,
    shareAmount,
    sharePrice,
    info?.mintingFee,
    slippage,
    hideModal,
  ]);

  const onPoolSelected = useCallback(
    (pool?: string) => {
      if (pool) {
        history.push(`/bank?action=mint&pool=${pool}`);
      }
    },
    [history],
  );

  const onApproveAndMint = async () => {
    await usdcContract.approve(tokens.POOLUSDC, collateralAmount);
    await shareContract.approve(tokens.POOLUSDC, shareAmount);
    await poolContract.mint(collateralAmount, shareAmount, minOutputAmount);
    hideModal();
  }

  useEffect(() => {
    setCollateralAmount(BigNumber.from(0))
    setShareAmount(BigNumber.from(0))
    setMinOutputAmount(BigNumber.from(0))
  }, [isZap]);

  useEffect(() => {
    setSharePrice(tokensInfo?.titan.price);
    setDollarPrice(tokensInfo?.iron.price);
    setCollateralPrice(BigNumber.from(1000000));
  }, [tokensInfo]);

  useEffect(() => {
    const auxilliaryFn = async () => {
      if (chainId) {
        setCollateralBalance(await usdcContract.balanceOf(account));
        setShareBalance(await shareContract.balanceOf(account));
        setDollarBalance(await dollarContract.balanceOf(account));
      }
    };
    auxilliaryFn();
  }, [chainId]);

  return !info ? (
    <MintContentLoader />
  ) : (
    <>
      <Card
        width="450px"
        animationDuration={0.3}
        background={'linear-gradient(to right,rgb(34 59 231 / 9%),rgb(52 67 249 / 15%))'}
      >
        <CardBody>
          <FormHeader>
            <FormTitle>Mint</FormTitle>
            <FormAction>
              <SlippageControlButton />
            </FormAction>
          </FormHeader>
          <SwitchContainer>
            <Switch
              checked={isZap}
              onChange={setIsZap}
              onColor={theme.color.primary.light}
              onHandleColor={theme.color.primary.main}
              handleDiameter={18}
              uncheckedIcon={false}
              checkedIcon={false}
              boxShadow="0px 1px 5px rgba(0, 0, 0, 0.6)"
              activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.2)"
              height={12}
              width={28}
            />
            <SwitchDesc>Use only USDC to mint</SwitchDesc>
          </SwitchContainer>
          <FormRow>
            <div className="row-header">
              <h6>
                Input
                {!isZap && (
                  <>
                    &middot;{' '}
                    <Number
                      percentage={true}
                      value={info.targetCollateralRatio}
                      decimals={6}
                      keepZeros={true}
                      precision={2}
                    />
                    %
                  </>
                )}
              </h6>
              {collateralBalance && (
                <div style={{ marginLeft: 'auto ' }}>
                  Balance: <Number value={collateralBalance} decimals={6} precision={6} />
                </div>
              )}
            </div>
            <div className="row-input">
              <TokenInput
                ref={refInputCollateral}
                token={'USDC'}
                decimals={6}
                precision={6}
                max={1e4}
                onChange={updateCollateralAmount}
                value={collateralAmount}
              />
              <FormToken>
                <ButtonSelectCollateral
                  poolAddress={query?.get('pool')}
                  onSelected={onPoolSelected}
                />
              </FormToken>
            </div>
          </FormRow>

          {!isFullCollaterallized && !isZap && (
            <FormSeparator>
              <i className="fas fa-plus" color={theme.color.grey[500]}></i>
            </FormSeparator>
          )}

          {!isFullCollaterallized && !isZap && (
            <FormRow>
              <div className="row-header">
                <h6>
                  REV &middot;{' '}
                  <Number
                    percentage={true}
                    value={BigNumber.from(1e6).sub(info.targetCollateralRatio)}
                    decimals={6}
                    keepZeros={true}
                    precision={2}
                  />
                  %
                </h6>
                {shareBalance && (
                  <div style={{ marginLeft: 'auto ' }}>
                    Balance: <Number value={shareBalance} decimals={6} precision={6} />
                  </div>
                )}
              </div>
              <div className="row-input">
                <TokenInput
                  ref={refInputShare}
                  token={'REV'}
                  decimals={6}
                  precision={6}
                  onChange={updateShareAmount}
                  value={shareAmount}
                />
                <FormToken>
                  <TokenSymbol size={32} symbol={'TITAN'}></TokenSymbol>
                  <span>REV</span>
                </FormToken>
              </div>
            </FormRow>
          )}

          <FormSeparator>
            <i className="fas fa-arrow-down" color={theme.color.primary.main} />
          </FormSeparator>

          <FormRow>
            <div className="row-header">
              <h6>Output (estimated)</h6>
              {dollarBalance && (
                <div style={{ marginLeft: 'auto ' }}>
                  Balance: <Number value={dollarBalance} decimals={18} precision={6} />
                </div>
              )}
            </div>
            <div className="row-input">
              <FormOutput>
                <Number value={minOutputAmount} decimals={6} precision={6} />
              </FormOutput>
              <FormToken>
                <TokenSymbol size={32} symbol="IRON"></TokenSymbol>
                <span>REVUSD</span>
              </FormToken>
            </div>
          </FormRow>
          <FormButtonsContainer>
            <ButtonMint
              isZap={isZap}
              mint={onMint}
              collateralRatio={info?.targetCollateralRatio}
              paused={false}
              collateralAmount={collateralAmount}
              shareAmount={shareAmount}
              isExceededCollateralBalance={false}
              isExceededShareBalance={false}
            />
          </FormButtonsContainer>
        </CardBody>
      </Card>
      <MintFooter collateralPrice={collateralPrice} mintFeeValue={mintFeeValue} tokensInfo={tokensInfo} />
    </>
  );
};

const SwitchContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  margin-top: -5px;
`;

const SwitchDesc = styled.span`
  margin-left: 10px;
  margin-bottom: 2px;
`;

export default Mint;
