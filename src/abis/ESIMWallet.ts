const ESIMWallet = [
    {
        "type": "receive",
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "acceptOwnershipTransfer",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "buyDataBundleWithToken",
        "inputs": [
            {
                "name": "_dataBundleDetail",
                "type": "tuple",
                "internalType": "struct DataBundleDetails",
                "components": [
                    {
                        "name": "id",
                        "type": "bytes32",
                        "internalType": "bytes32"
                    },
                    {
                        "name": "priceUSDCents",
                        "type": "uint64",
                        "internalType": "uint64"
                    },
                    {
                        "name": "settlement",
                        "type": "uint8",
                        "internalType": "enum Settlement"
                    }
                ]
            },
            {
                "name": "_asset",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "_maxAmountIn",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_paymentReference",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "deviceWallet",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract DeviceWallet"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "eSIMUniqueIdentifier",
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
        "name": "eSIMWalletFactory",
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
                "name": "_eSIMWalletFactoryAddress",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_deviceWalletAddress",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "newRequestedOwner",
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
        "name": "populateHistory",
        "inputs": [
            {
                "name": "_dataBundleDetails",
                "type": "tuple[]",
                "internalType": "struct DataBundleDetails[]",
                "components": [
                    {
                        "name": "id",
                        "type": "bytes32",
                        "internalType": "bytes32"
                    },
                    {
                        "name": "priceUSDCents",
                        "type": "uint64",
                        "internalType": "uint64"
                    },
                    {
                        "name": "settlement",
                        "type": "uint8",
                        "internalType": "enum Settlement"
                    }
                ]
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "priceCapUSDCents",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "recordSettledPurchase",
        "inputs": [
            {
                "name": "_dataBundleDetail",
                "type": "tuple",
                "internalType": "struct DataBundleDetails",
                "components": [
                    {
                        "name": "id",
                        "type": "bytes32",
                        "internalType": "bytes32"
                    },
                    {
                        "name": "priceUSDCents",
                        "type": "uint64",
                        "internalType": "uint64"
                    },
                    {
                        "name": "settlement",
                        "type": "uint8",
                        "internalType": "enum Settlement"
                    }
                ]
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
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
        "name": "requestTransferOwnership",
        "inputs": [
            {
                "name": "_newOwner",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "sendETHToDeviceWallet",
        "inputs": [
            {
                "name": "_amount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "sendTokenToDeviceWallet",
        "inputs": [
            {
                "name": "_token",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_amount",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setESIMUniqueIdentifier",
        "inputs": [
            {
                "name": "_eSIMUniqueIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "setPriceCapUSDCents",
        "inputs": [
            {
                "name": "_cap",
                "type": "uint64",
                "internalType": "uint64"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "transactionHistory",
        "inputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "id",
                "type": "bytes32",
                "internalType": "bytes32"
            },
            {
                "name": "priceUSDCents",
                "type": "uint64",
                "internalType": "uint64"
            },
            {
                "name": "settlement",
                "type": "uint8",
                "internalType": "enum Settlement"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "transferOwnership",
        "inputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "pure"
    },
    {
        "type": "event",
        "name": "DataBundleBoughtWithToken",
        "inputs": [
            {
                "name": "_dataBundleID",
                "type": "bytes32",
                "indexed": false,
                "internalType": "bytes32"
            },
            {
                "name": "_priceUSDCents",
                "type": "uint64",
                "indexed": false,
                "internalType": "uint64"
            },
            {
                "name": "_asset",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            },
            {
                "name": "_token",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_amountSpent",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "_paymentReference",
                "type": "bytes32",
                "indexed": true,
                "internalType": "bytes32"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "DataBundleSettlementRecorded",
        "inputs": [
            {
                "name": "_dataBundleID",
                "type": "bytes32",
                "indexed": false,
                "internalType": "bytes32"
            },
            {
                "name": "_priceUSDCents",
                "type": "uint64",
                "indexed": false,
                "internalType": "uint64"
            },
            {
                "name": "_settlement",
                "type": "uint8",
                "indexed": false,
                "internalType": "enum Settlement"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "ESIMUniqueIdentifierInitialised",
        "inputs": [
            {
                "name": "_eSIMUniqueIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "ESIMWalletDeployed",
        "inputs": [
            {
                "name": "_eSIMWalletAddress",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_deviceWalletAddress",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_owner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "ETHSent",
        "inputs": [
            {
                "name": "_recipient",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
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
        "name": "OwnershipTransferRequested",
        "inputs": [
            {
                "name": "_currentOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_newOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "OwnershipTransferRevoked",
        "inputs": [
            {
                "name": "_currentOwner",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_revokedOwner",
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
        "name": "PriceCapUSDCentsUpdated",
        "inputs": [
            {
                "name": "_cap",
                "type": "uint64",
                "indexed": false,
                "internalType": "uint64"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "TokenSentToDeviceWallet",
        "inputs": [
            {
                "name": "_token",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_deviceWallet",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_amount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "TransactionHistoryPopulated",
        "inputs": [
            {
                "name": "_dataBundleDetails",
                "type": "tuple[]",
                "indexed": false,
                "internalType": "struct DataBundleDetails[]",
                "components": [
                    {
                        "name": "id",
                        "type": "bytes32",
                        "internalType": "bytes32"
                    },
                    {
                        "name": "priceUSDCents",
                        "type": "uint64",
                        "internalType": "uint64"
                    },
                    {
                        "name": "settlement",
                        "type": "uint8",
                        "internalType": "enum Settlement"
                    }
                ]
            },
            {
                "name": "_totalEntries",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "AssetNotTransferable",
        "inputs": [
            {
                "name": "asset",
                "type": "bytes32",
                "internalType": "bytes32"
            }
        ]
    },
    {
        "type": "error",
        "name": "DataBundlePriceAboveCap",
        "inputs": [
            {
                "name": "priceUSDCents",
                "type": "uint64",
                "internalType": "uint64"
            },
            {
                "name": "cap",
                "type": "uint64",
                "internalType": "uint64"
            }
        ]
    },
    {
        "type": "error",
        "name": "ESIMIdentifierAlreadySet",
        "inputs": [
            {
                "name": "eSIMUniqueIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ]
    },
    {
        "type": "error",
        "name": "EmptyDataBundleID",
        "inputs": []
    },
    {
        "type": "error",
        "name": "EmptyESIMIdentifier",
        "inputs": []
    },
    {
        "type": "error",
        "name": "FailedToTransfer",
        "inputs": []
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
        "name": "InvalidInitialization",
        "inputs": []
    },
    {
        "type": "error",
        "name": "NotADeviceWallet",
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
        "name": "NotInitializing",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OnlyDeviceWallet",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OnlyDeviceWalletOrESIMWalletAdmin",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OnlyRegistry",
        "inputs": []
    },
    {
        "type": "error",
        "name": "OnlyRequestedOwner",
        "inputs": [
            {
                "name": "newRequestedOwner",
                "type": "address",
                "internalType": "address"
            }
        ]
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
        "name": "OwnershipCannotBeRenounced",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PaymentAdapterNotSet",
        "inputs": []
    },
    {
        "type": "error",
        "name": "ReentrancyGuardReentrantCall",
        "inputs": []
    },
    {
        "type": "error",
        "name": "SafeERC20FailedOperation",
        "inputs": [
            {
                "name": "token",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "SettlementAboveMax",
        "inputs": [
            {
                "name": "required",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "maxAmountIn",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "UseAcceptOwnershipTransfer",
        "inputs": []
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
    },
    {
        "type": "error",
        "name": "ZeroAmount",
        "inputs": []
    },
    {
        "type": "error",
        "name": "ZeroDataBundlePrice",
        "inputs": []
    }
] as const;

export default ESIMWallet;
