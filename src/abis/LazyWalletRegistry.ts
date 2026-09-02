const LazyWalletRegistry = [
    {
        "type": "function",
        "name": "MAX_ESIM_WALLETS_PER_CALL",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "MAX_HISTORY_ENTRIES_PER_CALL",
        "inputs": [],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
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
        "name": "batchPopulateHistory",
        "inputs": [
            {
                "name": "_deviceUniqueIdentifiers",
                "type": "string[]",
                "internalType": "string[]"
            },
            {
                "name": "_eSIMUniqueIdentifiers",
                "type": "string[][]",
                "internalType": "string[][]"
            },
            {
                "name": "_dataBundleDetails",
                "type": "tuple[][]",
                "internalType": "struct DataBundleDetails[][]",
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
        "name": "deployLazyWalletAndSetESIMIdentifier",
        "inputs": [
            {
                "name": "_deviceOwnerPublicKey",
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
            },
            {
                "name": "_depositAmount",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "_maxWallets",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "deviceWallet",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "eSIMWallets",
                "type": "address[]",
                "internalType": "address[]"
            },
            {
                "name": "remaining",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "deployMoreESIMWalletsForLazyDevice",
        "inputs": [
            {
                "name": "_deviceUniqueIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "_maxWallets",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "eSIMWallets",
                "type": "address[]",
                "internalType": "address[]"
            },
            {
                "name": "remaining",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "deviceIdentifierToESIMDetails",
        "inputs": [
            {
                "name": "deviceIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "eSIMIdentifier",
                "type": "string",
                "internalType": "string"
            },
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
        "name": "eSIMIdentifierToDeviceIdentifier",
        "inputs": [
            {
                "name": "eSIMIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [
            {
                "name": "deviceIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "eSIMIdentifiersAssociatedWithDeviceIdentifier",
        "inputs": [
            {
                "name": "deviceIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "associatedESIMIdentifiers",
                "type": "string",
                "internalType": "string"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "eSIMWalletsDeployed",
        "inputs": [
            {
                "name": "deviceIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [
            {
                "name": "deployed",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "historyEntriesCopied",
        "inputs": [
            {
                "name": "eSIMIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [
            {
                "name": "copied",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "initialize",
        "inputs": [
            {
                "name": "_registry",
                "type": "address",
                "internalType": "address"
            },
            {
                "name": "_upgradeManager",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "isDeviceIdentifierReserved",
        "inputs": [
            {
                "name": "_deviceUniqueIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "isESIMIdentifierReserved",
        "inputs": [
            {
                "name": "_eSIMUniqueIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "bool",
                "internalType": "bool"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "lazyDeployedESIMWallet",
        "inputs": [
            {
                "name": "eSIMIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [
            {
                "name": "eSIMWallet",
                "type": "address",
                "internalType": "address"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "lazyDeploymentSalt",
        "inputs": [
            {
                "name": "deviceIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [
            {
                "name": "baseSalt",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "outstandingHistoryEntries",
        "inputs": [
            {
                "name": "_eSIMIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "uint256",
                "internalType": "uint256"
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
        "name": "setHistoryForLazyWallet",
        "inputs": [
            {
                "name": "_eSIMIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "_maxEntries",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [
            {
                "name": "copied",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "remaining",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "switchESIMIdentifierToNewDeviceIdentifier",
        "inputs": [
            {
                "name": "_eSIMIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "_oldDeviceIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "_newDeviceIdentifier",
                "type": "string",
                "internalType": "string"
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
        "name": "upgradeManager",
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
        "type": "event",
        "name": "DataBundleDetailsDeletedFromOldDeviceIdentifier",
        "inputs": [
            {
                "name": "_oldDeviceIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "_eSIMIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "DataBundleDetailsTransferredToNewDeviceIdentifier",
        "inputs": [
            {
                "name": "_newDeviceIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "_newDataBundleDetails",
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
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "DataUpdatedForDevice",
        "inputs": [
            {
                "name": "_deviceUniqueIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "_eSIMUniqueIdentifiers",
                "type": "string[]",
                "indexed": false,
                "internalType": "string[]"
            },
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
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "ESIMBindedWithDevice",
        "inputs": [
            {
                "name": "_eSIMUniqueIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "_deviceUniqueIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "ESIMIdentifierAddedToNewDeviceIdentifier",
        "inputs": [
            {
                "name": "_newDeviceIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "_eSIMIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "_eSIMIdentifierOfNewDevice",
                "type": "string[]",
                "indexed": false,
                "internalType": "string[]"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "ESIMIdentifierRemovedFromOldDeviceIdentifier",
        "inputs": [
            {
                "name": "_oldDeviceIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "_eSIMIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "_eSIMIdentifierOfOldDevice",
                "type": "string[]",
                "indexed": false,
                "internalType": "string[]"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "ESIMIdentifierSwitchedToNewDeviceIdentifier",
        "inputs": [
            {
                "name": "_eSIMIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "_oldDeviceIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "currentDeviceIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
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
        "name": "LazyESIMWalletsDeployed",
        "inputs": [
            {
                "name": "_deviceUniqueIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "_deviceWallet",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_eSIMWallets",
                "type": "address[]",
                "indexed": false,
                "internalType": "address[]"
            },
            {
                "name": "_eSIMUniqueIdentifiers",
                "type": "string[]",
                "indexed": false,
                "internalType": "string[]"
            },
            {
                "name": "_remaining",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "LazyHistoryCopied",
        "inputs": [
            {
                "name": "_eSIMIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "_eSIMWallet",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_copied",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "_remaining",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "LazyWalletDeployed",
        "inputs": [
            {
                "name": "_deviceOwnerPublicKey",
                "type": "bytes32[2]",
                "indexed": false,
                "internalType": "bytes32[2]"
            },
            {
                "name": "deviceWallet",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "_deviceUniqueIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "eSIMWallets",
                "type": "address[]",
                "indexed": false,
                "internalType": "address[]"
            },
            {
                "name": "_eSIMUniqueIdentifiers",
                "type": "string[]",
                "indexed": false,
                "internalType": "string[]"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "NewDeviceIdentifierAssociatedWithESIMIdentifier",
        "inputs": [
            {
                "name": "_eSIMIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "_oldDeviceIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
            },
            {
                "name": "_newDeviceIdentifier",
                "type": "string",
                "indexed": false,
                "internalType": "string"
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
        "name": "AllESIMWalletsDeployed",
        "inputs": [
            {
                "name": "deviceIdentifier",
                "type": "string",
                "internalType": "string"
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
        "name": "CannotSwitchToTheSameDevice",
        "inputs": [
            {
                "name": "deviceIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ]
    },
    {
        "type": "error",
        "name": "DepositDoesNotMatchValue",
        "inputs": [
            {
                "name": "depositAmount",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "value",
                "type": "uint256",
                "internalType": "uint256"
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
        "name": "ESIMBoundToADifferentDevice",
        "inputs": [
            {
                "name": "eSIMIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "boundDeviceIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ]
    },
    {
        "type": "error",
        "name": "ESIMIdentifierAlreadyClaimed",
        "inputs": [
            {
                "name": "eSIMIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "eSIMWallet",
                "type": "address",
                "internalType": "address"
            }
        ]
    },
    {
        "type": "error",
        "name": "ESIMIdentifierNotFound",
        "inputs": [
            {
                "name": "eSIMIdentifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "deviceIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ]
    },
    {
        "type": "error",
        "name": "ESIMWalletNotLazyDeployed",
        "inputs": [
            {
                "name": "eSIMIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ]
    },
    {
        "type": "error",
        "name": "EmptyDeviceIdentifier",
        "inputs": []
    },
    {
        "type": "error",
        "name": "EmptyESIMIdentifier",
        "inputs": []
    },
    {
        "type": "error",
        "name": "FailedCall",
        "inputs": []
    },
    {
        "type": "error",
        "name": "HistoryAlreadyCopied",
        "inputs": [
            {
                "name": "eSIMIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ]
    },
    {
        "type": "error",
        "name": "IdentifierTooLong",
        "inputs": [
            {
                "name": "identifier",
                "type": "string",
                "internalType": "string"
            },
            {
                "name": "maxLength",
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
        "name": "LazyWalletAlreadyDeployed",
        "inputs": [
            {
                "name": "deviceIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ]
    },
    {
        "type": "error",
        "name": "LazyWalletNotDeployed",
        "inputs": [
            {
                "name": "deviceIdentifier",
                "type": "string",
                "internalType": "string"
            }
        ]
    },
    {
        "type": "error",
        "name": "NoESIMIdentifiersForDevice",
        "inputs": [
            {
                "name": "deviceIdentifier",
                "type": "string",
                "internalType": "string"
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
        "name": "OnlyESIMWalletAdmin",
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
        "name": "OwnershipCannotBeRenounced",
        "inputs": []
    },
    {
        "type": "error",
        "name": "SaltTooHigh",
        "inputs": [
            {
                "name": "salt",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "count",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "SettlementNotAsserted",
        "inputs": []
    },
    {
        "type": "error",
        "name": "TooManyESIMWallets",
        "inputs": [
            {
                "name": "requested",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "maxPerCall",
                "type": "uint256",
                "internalType": "uint256"
            }
        ]
    },
    {
        "type": "error",
        "name": "TooManyHistoryEntries",
        "inputs": [
            {
                "name": "requested",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "maxPerCall",
                "type": "uint256",
                "internalType": "uint256"
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
        "name": "UnknownESIMIdentifier",
        "inputs": [
            {
                "name": "eSIMIdentifier",
                "type": "string",
                "internalType": "string"
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

export default LazyWalletRegistry;
