const DeviceWalletFactory = [
    {
        "type": "function",
        "name": "UPGRADE_INTERFACE_VERSION",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "string",
                "internalType": "string"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "acceptOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "addRegistryAddress",
        "inputs": [
            {
                "name": "_registryContractAddress",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "beacon",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract UpgradeableBeacon"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "createAccount",
        "inputs": [
            {
                "name": "_deviceUniqueIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "_deviceWalletOwnerKey",
                "type": "bytes32[2]",
                "internalType": "bytes32[2]"
            },
            {
                "name": "_salt",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "deviceWallet",
                "type": "address",
                "internalType": "contract DeviceWallet"
            }
        ],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "deployDeviceWalletForUsers",
        "inputs": [
            {
                "name": "_deviceUniqueIdentifiers",
                "type": "string[]",
                "internalType": "string[]"
            },
            {
                "name": "_deviceWalletOwnersKey",
                "type": "bytes32[2][]",
                "internalType": "bytes32[2][]"
            },
            {
                "name": "_salts",
                "type": "uint256[]",
                "internalType": "uint256[]"
            },
            {
                "name": "_depositAmounts",
                "type": "uint256[]",
                "internalType": "uint256[]"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "tuple[]",
                "internalType": "struct Wallets[]",
                "components": [
                    {
                        "name": "deviceWallet",
                        "type": "address",
                        "internalType": "address"
                    },
                    {
                        "name": "eSIMWallet",
                        "type": "address",
                        "internalType": "address"
                    }
                ]
            }
        ],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "deviceWalletInfoAdded",
        "inputs": [
            {
                "name": "deviceWallet",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "isAdded",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "eSIMWalletAdmin",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "eSIMWalletFactory",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract ESIMWalletFactory"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "entryPoint",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract IEntryPoint"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getCounterFactualAddress",
        "inputs": [
            {
                "name": "_deviceWalletOwnerKey",
                "type": "bytes32[2]",
                "internalType": "bytes32[2]"
            },
            {
                "name": "_deviceUniqueIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "_salt",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getCurrentDeviceWalletImplementation",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "initialize",
        "inputs": [
            {
                "name": "_deviceWalletImplementation",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_upgradeManager",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_eSIMWalletFactoryAddress",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_entryPoint",
                "type": "address",
                "internalType": "contract IEntryPoint"
            },
            {
                "name": "_verifier",
                "type": "address",
                "internalType": "contract P256Verifier"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "owner",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "pendingOwner",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "postCreateAccount",
        "inputs": [
            {
                "name": "_deviceWallet",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_deviceUniqueIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "_deviceWalletOwnerKey",
                "type": "bytes32[2]",
                "internalType": "bytes32[2]"
            },
            {
                "name": "_salt",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "preCreateAccountValidation",
        "inputs": [
            {
                "name": "_deviceUniqueIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "_deviceWalletOwnerKey",
                "type": "bytes32[2]",
                "internalType": "bytes32[2]"
            }
        ],
        "outputs": [
            {
                "name": "wallet",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "proxiableUUID",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "registry",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract Registry"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "renounceOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "pure"
    },
    {
        "type": "function",
        "name": "transferOwnership",
        "inputs": [
            {
                "name": "newOwner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "updateDeviceWalletImplementation",
        "inputs": [
            {
                "name": "_newDeviceImpl",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "upgradeToAndCall",
        "inputs": [
            {
                "name": "newImplementation",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "data",
                "type": "bytes",
                "internalType": "bytes"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "verifier",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract P256Verifier"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "event",
        "name": "AddedRegistry",
        "inputs": [
            {
                "name": "registry",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "DeviceWalletDeployed",
        "inputs": [
            {
                "name": "_deviceWalletAddress",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_eSIMWalletAddress",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_deviceWalletOwnerKey",
                "type": "bytes32[2]",
                "indexed": false,
                "internalType": "bytes32[2]"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "DeviceWalletFactoryDeployed",
        "inputs": [
            {
                "name": "_upgradeManager",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_deviceWalletImplementation",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_beacon",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "DeviceWalletImplementationUpdated",
        "inputs": [
            {
                "name": "_newDeviceImplementation",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Initialized",
        "inputs": [
            {
                "name": "version",
                "type": "uint64",
                "indexed": false,
                "internalType": "uint64"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "OwnershipTransferStarted",
        "inputs": [
            {
                "name": "previousOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "newOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "OwnershipTransferred",
        "inputs": [
            {
                "name": "previousOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "newOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Upgraded",
        "inputs": [
            {
                "name": "implementation",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "AddressEmptyCode",
        "inputs": [
            {
                "name": "target",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "ArrayLengthMismatch",
        "inputs": [
            {
                "name": "expected",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "actual",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "DeviceWalletAlreadyExists",
        "inputs": [
            {
                "name": "deviceIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "deviceWallet",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "DeviceWalletInfoAlreadyAdded",
        "inputs": [
            {
                "name": "deviceWallet",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "DeviceWalletMismatch",
        "inputs": [
            {
                "name": "deviceWallet",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "derived",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "DeviceWalletNotDeployed",
        "inputs": [
            {
                "name": "deviceWallet",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "ERC1967InvalidImplementation",
        "inputs": [
            {
                "name": "implementation",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "ERC1967NonPayable",
        "inputs": []
    },
    {
        "type": "error",
        "name": "EmptyBatch",
        "inputs": []
    },
    {
        "type": "error",
        "name": "EmptyDeviceIdentifier",
        "inputs": []
    },
    {
        "type": "error",
        "name": "FailedCall",
        "inputs": []
    },
    {
        "type": "error",
        "name": "FailedToTransfer",
        "inputs": []
    },
    {
        "type": "error",
        "name": "ImplementationUnchanged",
        "inputs": [
            {
                "name": "implementation",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "InsufficientBalance",
        "inputs": [
            {
                "name": "balance",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "InvalidDeviceWalletOwnerKey",
        "inputs": []
    },
    {
        "type": "error",
        "name": "InvalidInitialization",
        "inputs": []
    },
    {
        "type": "error",
        "name": "NotInitializing",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OnlyAdminOrRegistry",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OwnableInvalidOwner",
        "inputs": [
            {
                "name": "owner",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "OwnableUnauthorizedAccount",
        "inputs": [
            {
                "name": "account",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "OwnerKeyAlreadyRegistered",
        "inputs": [
            {
                "name": "ownerKeyHash",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ]
    },
    {
        "type": "error",
        "name": "OwnershipCannotBeRenounced",
        "inputs": []
    },
    {
        "type": "error",
        "name": "RegistryAlreadySet",
        "inputs": [
            {
                "name": "registry",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "UUPSUnauthorizedCallContext",
        "inputs": []
    },
    {
        "type": "error",
        "name": "UUPSUnsupportedProxiableUUID",
        "inputs": [
            {
                "name": "slot",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ]
    },
    {
        "type": "error",
        "name": "ZeroAddress",
        "inputs": [
            {
                "name": "parameter",
                "type": "string",
                "internalType": "string"
            }
        ]
    }
] as const;

export default DeviceWalletFactory;
