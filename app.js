const ethers = window.ethers;

// ====================== CONFIG ======================
// IMPORTANT: Replace these with your actual smart contract addresses!
const NFT_ADDRESS = "0xfd7a3fc37d607bc0364165dbb0d0741949c09167"; 
const STAKING_ADDRESS = "0xfd7a3fc37d607bc0364165dbb0d0741949c09167";
const CHAIN_ID = 4663; // Robinhood Chain
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
let provider, signer, userAddress;
let stakingContract, nftContract;
let selectedToStake = new Set();
let selectedToUnstake = new Set();

// ====================== HELPERS ======================
const $ = (id) => document.getElementById(id);

const toast = (msg) => {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 3500);
};

// ====================== MAIN EXECUTION BLOCK ======================
document.addEventListener("DOMContentLoaded", () => {
  
  // 1. OPEN CUSTOM SELECTION MODAL POPUP
  if ($("connectBtn")) {
    $("connectBtn").onclick = function () {
      $("walletModal").classList.remove("hidden");
    };
  }

  // 2. CLOSE CUSTOM SELECTION MODAL POPUP
  if ($("closeModal")) {
    $("closeModal").onclick = function () {
      $("walletModal").classList.add("hidden");
    };
  }

  // 3. SELECTION OPTIONS (METAMASK / TRUST / ZERION CLICK HANDLERS)
  document.querySelectorAll(".wallet-option").forEach((btn) => {
    btn.onclick = async () => {
      const walletType = btn.getAttribute("data-wallet").toLowerCase();
      $("walletModal").classList.add("hidden"); // Hide selection screen immediately

      let selectedProvider = window.ethereum;

      // Handle specific extension provider overrides accurately
      if (walletType === "metamask" && window.ethereum?.isMetaMask) {
        selectedProvider = window.ethereum;
      } else if (walletType === "zerion" && window.ethereum?.isZerion) {
        selectedProvider = window.ethereum;
      } else if (window.ethereum?.providers) {
        selectedProvider = window.ethereum.providers.find(p => {
          if (walletType === "metamask" && p.isMetaMask) return true;
          if (walletType === "zerion" && p.isZerion) return true;
          if (walletType === "trust" && p.isTrust) return true;
          if (walletType === "okx" && p.isOKX) return true; 
          if (walletType === "rabby" && p.isRabby) return true;
          return false;
        }) || window.ethereum;
      }

      if (!selectedProvider) {
        alert(`Please make sure your wallet extension is turned on and active!`);
        return;
      }

      try {
        provider = new ethers.BrowserProvider(selectedProvider);
        const accounts = await provider.send("eth_requestAccounts", []);
        
        // Handle Network Chain Switching Verification
        try {
          await selectedProvider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x" + CHAIN_ID.toString(16) }],
          });
        } catch (switchError) {
          if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
            await selectedProvider.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0x" + CHAIN_ID.toString(16),
                chainName: "Robinhood Chain",
                rpcUrls: [RPC_URL],
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                blockExplorerUrls: ["https://blockscout.com"],
              }],
            });
          }
        }

        signer = await provider.getSigner();
        userAddress = await signer.getAddress();

        // stakingContract = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signer);
        // nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);

        if ($("connectBtn")) {
          $("connectBtn").textContent = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
          $("connectBtn").classList.add("connected");
        }

        toast("Wallet connected ✓");
        // await loadAllData();
        
      } catch (err) {
        console.error("User connection routine aborted:", err);
        toast("Connection rejected");
      }
    };
  });

  // 4. CLOSING INTERACTION SYSTEMS
  window.addEventListener("click", (e) => {
    if (e.target === $("walletModal")) {
      $("walletModal").classList.add("hidden");
    }
  });

  // 5. STAKE ACTION HANDLER
  if ($("stakeBtn")) {
    $("stakeBtn").onclick = async () => {
      if (selectedToStake.size === 0) return toast("Select at least one NFT");
      try {
        const approved = await nftContract.isApprovedForAll(userAddress, STAKING_ADDRESS);
        if (!approved) {
          toast("Approving collection...");
          const tx = await nftContract.setApprovalForAll(STAKING_ADDRESS, true);
          await tx.wait();
        }
        const ids = Array.from(selectedToStake).map((id) => BigInt(id));
        toast("Staking...");
        const tx = await stakingContract.stake(ids);
        await tx.wait();
        toast("Staked successfully! 🍾");
        selectedToStake.clear();
        await loadAllData();
      } catch (e) {
        console.error(e);
        toast("Stake failed");
      }
    };
  }

  // 6. UNSTAKE ACTION HANDLER
  if ($("unstakedBtn")) {
    $("unstakedBtn").onclick = async () => {
      if (selectedToUnstake.size === 0) return toast("Select NFTs to unstake");
      try {
        const ids = Array.from(selectedToUnstake).map((id) => BigInt(id));
        toast("Unstaking...");
        const tx = await stakingContract.unstake(ids);
        await tx.wait();
        toast("Unstaked!");
        selectedToUnstake.clear();
        await loadAllData();
      } catch (e) {
        console.error(e);
        toast("Unstake failed");
      }
    };
  }

  // 7. CLAIM REWARDS ACTION HANDLER
  if ($("claimBtn")) {
    $("claimBtn").onclick = async () => {
      try {
        toast("Claiming rewards...");
        const tx = await stakingContract.claimAll();
        await tx.wait();
        toast("Rewards claimed!");
        await loadAllData();
      } catch (e) {
        console.error(e);
        toast("Claim failed");
      }
    };
  }
});

// ====================== BACKEND TOKEN LOAD LOGIC ======================
async function loadAllData() {
  if (!userAddress) return;
  try {
    if ($("stakedCount")) {
      const stakedBal = await stakingContract.balanceOf(userAddress);
      $("stakedCount").textContent = stakedBal.toString();
    }
    if ($("totalStaked")) {
      const total = await stakingContract.totalStaked();
      $("totalStaked").textContent = total.toString();
    }

    const walletGrid = $("nftGrid");
    if (walletGrid) {
      const balance = await nftContract.balanceOf(userAddress);
      walletGrid.innerHTML = "";
      if (Number(balance) === 0) {
        walletGrid.innerHTML = '<div class="empty">You have no NFTs in this wallet</div>';
      } else {
        for (let i = 0; i < Number(balance); i++) {
          const tokenId = await nftContract.tokenOfOwnerByIndex(userAddress, i);
          const div = document.createElement("div");
          div.className = "nft-item";
          div.dataset.id = tokenId.toString();
          div.innerHTML = `
            <div style="width:100%;height:100%;background:#1a1a24;display:flex;align-items:center;justify-content:center;font-size:1.1rem;min-height:120px;border-radius:8px;">
              #${tokenId}
            </div>
            <div class="token-id">#${tokenId}</div>
          `;
          div.onclick = () => toggleSelect(div, selectedToStake);
          walletGrid.appendChild(div);
        }
      }
    }

    const stakedGrid = $("stakedGrid");
    if (stakedGrid) {
      const stakedIds = await stakingContract.getStakedTokens(userAddress);
      stakedGrid.innerHTML = "";
      if (stakedIds.length === 0) {
        stakedGrid.innerHTML = '<div class="empty">No NFTs currently staked</div>';
      } else {
        stakedIds.forEach((id) => {
          const div = document.createElement("div");
          div.className = "nft-item";
          div.dataset.id = id.toString();
          div.innerHTML = `
            <div style="width:100%;height:100%;background:#1a1a24;display:flex;align-items:center;justify-content:center;font-size:1.1rem;min-height:120px;border-radius:8px;">
              #${id}
            </div>
            <div class="token-id">#${id}</div>
          `;
          div.onclick = () => toggleSelect(div, selectedToUnstake);
          stakedGrid.appendChild(div);
        });
      }
    }

    if ($("stakeBtn")) $("stakeBtn").disabled = false;
    if ($("unstakedBtn")) $("unstakedBtn").disabled = false;
    if ($("claimBtn")) $("claimBtn").disabled = false;
  } catch (err) {
    console.error("Load error:", err);
    toast("Error loading NFTs");
  }
}

// ====================== SELECTION UTILITY ======================
function toggleSelect(element, set) {
  const id = element.dataset.id;
  if (set.has(id)) {
    set.delete(id);
    element.classList.remove("selected");
  } else {
    set.add(id);
    element.classList.add("selected");
  }
}

