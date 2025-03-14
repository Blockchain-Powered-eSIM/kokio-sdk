import { WalletClient, getContract, GetContractReturnType, ContractFunctionReturnType } from "viem";
import { WalletClientSigner } from "@aa-sdk/core";
import { _getChainSpecificConstants, _extractChainID } from "./constants";
import { 
    DeviceWallet,
    DeviceWalletFactory,
    ESIMWallet,
    ESIMWalletFactory,
    LazyWalletRegistry,
    P256Verifier,
    Registry,
    RegistryHelper
} from '../abis';
import { _add0x } from "./utils";

export const getContractInstance = async (client: WalletClient) => {

    const chainID = await _extractChainID(client);
    const values = _getChainSpecificConstants(chainID);

    const getDeviceWalletFactory = () => getContract({
        abi: DeviceWalletFactory,
        address: _add0x(values.factoryAddresses.DEVICE_WALLET_FACTORY),
        client
    })

    const getDeviceWallet = (address: string) => getContract({
        abi: DeviceWallet,
        address: _add0x(address),
        client
    })

    const getESIMWalletFactory = () => getContract({
        abi: ESIMWalletFactory,
        address: _add0x(values.factoryAddresses.ESIM_WALLET_FACTORY),
        client
    })

    const getESIMWallet = (address: string) => getContract({
        abi: ESIMWallet,
        address: _add0x(address),
        client
    })

    const getLazyWalletRegistry = () => getContract({
        abi: LazyWalletRegistry,
        address: _add0x(values.factoryAddresses.LAZY_WALLET_REGISTRY),
        client
    })

    const getP256Verifier = () => getContract({
        abi: P256Verifier,
        address: _add0x(values.factoryAddresses.P256Verifier),
        client
    })

    const getRegistry = () => getContract({
        abi: Registry,
        address: _add0x(values.factoryAddresses.REGISTRY),
        client
    })

    const getRegistryHelper = () => getContract({
        abi: RegistryHelper,
        address: _add0x(values.factoryAddresses.REGISTRY_HELPER),
        client
    })

    return {
        deviceWalletFactory: getDeviceWalletFactory,
        deviceWallet: getDeviceWallet,
        ESIMWalletFactory: getESIMWalletFactory,
        ESIMWallet: getESIMWallet,
        lazyWalletRegistry: getLazyWalletRegistry,
        P256Verifier: getP256Verifier,
        registry: getRegistry,
        registryHelper: getRegistryHelper
    }
}