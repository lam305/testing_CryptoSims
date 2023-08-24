const Auction = artifacts.require("Auction");

module.exports = function(deployer) {
  deployer.deploy(Auction, 50, 5);
};
