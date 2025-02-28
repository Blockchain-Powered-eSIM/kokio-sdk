import { WalletClient, PublicClient, getContract } from "viem";
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

export const getContractInstance = async (client: WalletClient | PublicClient) => {

    const chainID = await _extractChainID(client);
    const values = _getChainSpecificConstants(chainID);

    const getDeviceWalletFactory = () => {
        return getContract({
            abi: DeviceWalletFactory,
            address: _add0x(values.factoryAddresses.DEVICE_WALLET_FACTORY),
            client
        })
    }

    const getDeviceWallet = (address: string) => {
        return getContract({
            abi: DeviceWallet,
            address: _add0x(address),
            client
        })
    }

    const getESIMWalletFactory = () => {
        return getContract({
            abi: ESIMWalletFactory,
            address: _add0x(values.factoryAddresses.ESIM_WALLET_FACTORY),
            client
        })
    }

    const getESIMWallet = (address: string) => {
        return getContract({
            abi: ESIMWallet,
            address: _add0x(address),
            client
        })
    }

    const getLazyWalletRegistry = () => {
        return getContract({
            abi: LazyWalletRegistry,
            address: _add0x(values.factoryAddresses.LAZY_WALLET_REGISTRY),
            client
        })
    }

    const getP256Verifier = () => {
        return getContract({
            abi: P256Verifier,
            address: _add0x(values.factoryAddresses.P256Verifier),
            client
        })
    }

    const getRegistry = () => {
        return getContract({
            abi: Registry,
            address: _add0x(values.factoryAddresses.REGISTRY),
            client
        })
    }

    const getRegistryHelper = () => {
        return getContract({
            abi: RegistryHelper,
            address: _add0x(values.factoryAddresses.REGISTRY_HELPER),
            client
        })
    }
}