import { ethers } from "https://esm.sh/ethers@6";

console.log("app.js loaded");

// ====================== CONFIG ======================

// Temporary test addresses
const NFT_ADDRESS = "0xfd7a3fc37d607bc0364165dbb0d0741949c09167";
const STAKING_ADDRESS = "0xfd7a3fc37d607bc0364165dbb0d0741949c09167";

// Robinhood Chain
const CHAIN_ID = 4663;

// Placeholder RPC (replace with the real RPC later)
const RPC_URL = "https://robinhood.com";

// ====================== ABIs ======================

const STAKING_ABI = [
  "function stake(uint256[] tokenIds)",
  "function unstake(uint256[] tokenIds)",
  "function claimAll()",
  "function balanceOf(address) view returns (uint256)",
  "function totalStaked() view returns (uint256)",
  "function getStakedTokens(address) view returns (uint256[])"
];

const NFT_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function setApprovalForAll(address operator, bool approved)"
];


// ====================== STATE ======================

let provider = null;
let signer = null;
let userAddress = null;

let stakingContract = null;
let nftContract = null;

let selectedToStake = new Set();
let selectedToUnstake = new Set();

let isWalletConnected = false;

// ====================== HELPERS ======================

const $ = (id) => document.getElementById(id);

function toast(message) {
    const t = $("toast");
    if (!t) return;

    t.textContent = message;
    t.classList.remove("hidden");

    setTimeout(() => {
        t.classList.add("hidden");
    }, 3500);
}

// ====================== MAIN EXECUTION BLOCK ======================

document.addEventListener("DOMContentLoaded", () => {

    console.log("DOM loaded");

    const connectBtn = $("connectBtn");

    if (!connectBtn) {
        console.error("connectBtn not found");
        return;
    }

    console.log("Found connect button");

    connectBtn.onclick = () => {

        console.log("Connect button clicked");

        // Disconnect
        if (isWalletConnected) {

            provider = null;
            signer = null;
            userAddress = null;

            stakingContract = null;
            nftContract = null;

            selectedToStake.clear();
            selectedToUnstake.clear();

            isWalletConnected = false;

            connectBtn.textContent = "Connect Wallet";
            connectBtn.classList.remove("connected");

            if ($("nftGrid")) {
                $("nftGrid").innerHTML =
                    '<div class="empty">Connect your wallet to load NFTs</div>';
            }

            if ($("stakedGrid")) {
                $("stakedGrid").innerHTML =
                    '<div class="empty">No NFTs staked yet</div>';
            }

            toast("Wallet disconnected");

            return;
        }

        // Open wallet modal
        const modal = $("walletModal");

        if (!modal) {
            console.error("walletModal not found");
            return;
        }

        modal.classList.remove("hidden");
    };

              toast("Wallet disconnected");
        return;
    }

    // ======================
    // OPEN WALLET MODAL
    // ======================

    const modal = $("walletModal");

    if (!modal) {
        console.error("walletModal not found");
        return;
    }

    modal.classList.remove("hidden");
};

// ======================
// CLOSE WALLET MODAL
// ======================

const closeModal = $("closeModal");

if (closeModal) {
    closeModal.onclick = () => {
        $("walletModal").classList.add("hidden");
    };
}


// ======================
// WALLET SELECTION
// ======================

document.querySelectorAll(".wallet-option").forEach((btn) => {

    btn.onclick = async () => {

        const walletType = btn.dataset.wallet.toLowerCase();

        $("walletModal").classList.add("hidden");

        try {

            console.log("Selected wallet:", walletType);

            if (!window.ethereum) {
                toast("No wallet detected");
                return;
            }

            const providers = window.ethereum.providers || [window.ethereum];

            let selectedProvider = null;

            for (const p of providers) {

                switch (walletType) {

                    case "metamask":
                        if (p.isMetaMask) selectedProvider = p;
                        break;

                    case "trust":
                        if (p.isTrust) selectedProvider = p;
                        break;

                    case "zerion":
                        if (p.isZerion) selectedProvider = p;
                        break;

                    // These wallets usually inject differently or require SDKs.
                    // For now they'll fall back to the default injected provider.

                    case "okx":
                    case "rabby":
                    case "walletconnect":
                        selectedProvider = p;
                        break;
                }

                if (selectedProvider) break;
            }

            if (!selectedProvider) {
                toast(`${walletType} wallet not detected`);
                return;
            }

            console.log("Using provider:", selectedProvider);

            provider = new ethers.BrowserProvider(selectedProvider);

            await provider.send("eth_requestAccounts", []);

            signer = await provider.getSigner();
            userAddress = await signer.getAddress();

            console.log("Connected:", userAddress);

            // Create contract instances
            stakingContract = new ethers.Contract(
                STAKING_ADDRESS,
                STAKING_ABI,
                signer
            );

            nftContract = new ethers.Contract(
                NFT_ADDRESS,
                NFT_ABI,
                signer
            );

            isWalletConnected = true;

            const connectBtn = $("connectBtn");

            if (connectBtn) {
                connectBtn.textContent =
                    `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;

                connectBtn.classList.add("connected");
            }

            if ($("stakeBtn")) $("stakeBtn").disabled = false;
            if ($("unstakedBtn")) $("unstakedBtn").disabled = false;
            if ($("claimBtn")) $("claimBtn").disabled = false;

            toast("Wallet connected ✓");

            // Load NFT data
            await loadAllData();

        } catch (err) {

            console.error("Wallet connection failed:", err);

            toast("Connection rejected");
        }

    };

});


    // Enable action buttons
            if ($("stakeBtn")) {
                $("stakeBtn").disabled = false;
            }

            if ($("unstakedBtn")) {
                $("unstakedBtn").disabled = false;
            }

            if ($("claimBtn")) {
                $("claimBtn").disabled = false;
            }

            toast("Wallet connected ✓");

            // Load wallet NFTs and staking data
            await loadAllData();

        } catch (err) {

            console.error("Wallet connection failed:", err);

            toast("Connection rejected");
        }

    };

});


      // stakingContract = new ethers.Contract(
        // STAKING_ADDRESS,
        // STAKING_ABI,
        // signer
      // );

      // nftContract = new ethers.Contract(
      //   NFT_ADDRESS,
      //   NFT_ABI,
      //   signer
      // );
  


// ======================
// CLOSE MODAL WHEN CLICKING OUTSIDE
// ======================

window.addEventListener("click", (e) => {
    const modal = $("walletModal");

    if (e.target === modal) {
        modal.classList.add("hidden");
    }
});

// ======================
// STAKE ACTION
// ======================

const stakeBtn = $("stakeBtn");

if (stakeBtn) {

    stakeBtn.onclick = async () => {

        if (!stakingContract || !nftContract) {
            toast("Please connect your wallet first");
            return;
        }

        if (selectedToStake.size === 0) {
            toast("Select at least one NFT");
            return;
        }

        try {

            const approved = await nftContract.isApprovedForAll(
                userAddress,
                STAKING_ADDRESS
            );

            if (!approved) {

                toast("Approving collection...");

                const approvalTx = await nftContract.setApprovalForAll(
                    STAKING_ADDRESS,
                    true
                );

                await approvalTx.wait();
            }

            const tokenIds = [...selectedToStake].map(id => BigInt(id));

            toast("Staking NFTs...");

            const stakeTx = await stakingContract.stake(tokenIds);

            await stakeTx.wait();

            toast("NFTs staked successfully 🍾");

            selectedToStake.clear();

            await loadAllData();

        } catch (err) {

            console.error("Stake error:", err);

            toast("Stake failed");
        }

    };

}

// ======================
// UNSTAKE ACTION
// ======================

const unstakeBtn = $("unstakedBtn");

if (unstakeBtn) {

    unstakeBtn.onclick = async () => {

        if (!stakingContract) {
            toast("Please connect your wallet first");
            return;
        }

        if (selectedToUnstake.size === 0) {
            toast("Select NFTs to unstake");
            return;
        }

        try {

            const tokenIds = [...selectedToUnstake].map(id => BigInt(id));

            toast("Unstaking NFTs...");

            const tx = await stakingContract.unstake(tokenIds);

            await tx.wait();

            selectedToUnstake.clear();

            toast("NFTs unstaked!");

            await loadAllData();

        } catch (err) {

            console.error("Unstake error:", err);

            toast("Unstake failed");
        }

    };

}

// ======================
// CLAIM REWARDS
// ======================

const claimBtn = $("claimBtn");

if (claimBtn) {

    claimBtn.onclick = async () => {

        if (!stakingContract) {
            toast("Please connect your wallet first");
            return;
        }

        try {

            toast("Claiming rewards...");

            const tx = await stakingContract.claimAll();

            await tx.wait();

            toast("Rewards claimed!");

            await loadAllData();

        } catch (err) {

            console.error("Claim error:", err);

            toast("Claim failed");
        }

    };

}

}); // END DOMContentLoaded

// ======================
// LOAD NFT DATA
// ======================

async function loadAllData() {

    if (!userAddress || !stakingContract || !nftContract) {
        return;
    }

    try {

        // Staked balance
        if ($("stakedCount")) {
            const balance = await stakingContract.balanceOf(userAddress);
            $("stakedCount").textContent = balance.toString();
        }

        // Total staked
        if ($("totalStaked")) {
            const total = await stakingContract.totalStaked();
            $("totalStaked").textContent = total.toString();
        }

        // ---------------- Wallet NFTs ----------------

        const walletGrid = $("nftGrid");

        if (walletGrid) {

            walletGrid.innerHTML = "";

            const balance = Number(
                await nftContract.balanceOf(userAddress)
            );

            if (balance === 0) {

                walletGrid.innerHTML =
                    '<div class="empty">You have no NFTs in this wallet</div>';

            } else {

                for (let i = 0; i < balance; i++) {

                    const tokenId = await nftContract.tokenOfOwnerByIndex(
                        userAddress,
                        i
                    );

                    const card = document.createElement("div");

                    card.className = "nft-item";
                    card.dataset.id = tokenId.toString();

                    card.innerHTML = `
                        <div style="width:100%;height:100%;background:#1a1a24;display:flex;align-items:center;justify-content:center;min-height:120px;border-radius:8px;">
                            #${tokenId}
                        </div>

                        <div class="token-id">
                            #${tokenId}
                        </div>
                    `;

                    card.onclick = () =>
                        toggleSelect(card, selectedToStake);

                    walletGrid.appendChild(card);

                }

            }

        }

        // ---------------- Staked NFTs ----------------

        const stakedGrid = $("stakedGrid");

        if (stakedGrid) {

            stakedGrid.innerHTML = "";

            const stakedIds =
                await stakingContract.getStakedTokens(userAddress);

            if (stakedIds.length === 0) {

                stakedGrid.innerHTML =
                    '<div class="empty">No NFTs currently staked</div>';

            } else {

                stakedIds.forEach((id) => {

                    const card = document.createElement("div");

                    card.className = "nft-item";
                    card.dataset.id = id.toString();

                    card.innerHTML = `
                        <div style="width:100%;height:100%;background:#1a1a24;display:flex;align-items:center;justify-content:center;min-height:120px;border-radius:8px;">
                            #${id}
                        </div>

                        <div class="token-id">
                            #${id}
                        </div>
                    `;

                    card.onclick = () =>
                        toggleSelect(card, selectedToUnstake);

                    stakedGrid.appendChild(card);

                });

            }

        }

    } catch (err) {

        console.error("Load error:", err);

        toast("Error loading NFTs");

    }

}

// ======================
// NFT SELECTION
// ======================

function toggleSelect(element, selectionSet) {

    const id = element.dataset.id;

    if (selectionSet.has(id)) {

        selectionSet.delete(id);

        element.classList.remove("selected");

    } else {

        selectionSet.add(id);

        element.classList.add("selected");

    }

}


