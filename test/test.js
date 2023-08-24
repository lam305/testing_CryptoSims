let Auction = artifacts.require('./Auction.sol');
var chai = require('chai');
var expect = chai.expect;

 

let auctionInstance;

 

contract('AuctionContract', function(accounts) {

  //accounts[0] is the default account

  describe('Contract deployment', function() {

    it('Contract deployment', function() {

      //Fetching the contract instance of our smart contract

      return Auction.deployed().then(function(instance) {

        //We save the instance in a global variable and all smart contract functions are called using this

        auctionInstance = instance;

        assert(

          auctionInstance !== undefined,

          'Auction contract should be defined'

        );

      });

    });

    it('Initial rule with corrected startingPrice and minimumStep', function() {

      //Fetching the rule of Auction

      return auctionInstance.rule().then(function(rule) {

        //We save the instance in a global variable and all smart contract functions are called using this

        assert(rule !== undefined, 'Rule should be defined');

 

        assert.equal(rule.startingPrice, 50, 'Starting price should be 50');

        assert.equal(rule.minimumStep, 5, 'Minimum step should be 5');

      });

    });

  });


  describe("Test register function", function() {
    it("Can register the bidders", async () => {
      await auctionInstance.register(accounts[1], 200, {from:accounts[0]});
      await auctionInstance.register(accounts[2], 150, {from:accounts[0]});
      await auctionInstance.register(accounts[3], 180, {from:accounts[0]});
      await auctionInstance.register(accounts[4], 250, {from:accounts[0]});
      const bidders = [];
      const token_bidders = [];
      for(let i = 1; i <= 4; i++){
        bidders[i] = await auctionInstance.bidders(accounts[i]);
        token_bidders[i] = await bidders[i].token;
      }
      assert.equal(token_bidders[1].toString(), '200');
      assert.equal(token_bidders[2].toString(), '150');
      assert.equal(token_bidders[3].toString(), '180');
      assert.equal(token_bidders[4].toString(), '250');
    });

    it("Only Auctioneer can register the bidders", async () => {
      try{
        await auctionInstance.register(accounts[5], 100, {from:accounts[1]});
      }catch(e){
        assert(e.message.includes("Only auctioneer can call this."));
        return;
      }
      assert(false);
    });

    it("Have to enter the account address and the number of token when register", async () => {
      try{
        await auctionInstance.register({from:accounts[0]});
      }catch(e){
        assert(true);
        return;
      }
      assert(false);
    });
  });


  describe("Auction start", function() {

    it("Should NOT allow non Auctioneer to start session", async () =>{
      try{
        //
        await auctionInstance.startSession({from:accounts[1]});
      }catch(e){
        assert(e.message.includes("Only auctioneer can call this."));
        return;
      }
      assert(false);
    });

    it("Should NOT allow to register if it not in CREATED state ", async () =>{
          try{
            await auctionInstance.startSession({from:accounts[0]}); // change state to STARTED
            await auctionInstance.register(accounts[5], 100, {from:accounts[0]});
          }catch(e){
            assert(e.message.includes("invalid state"));
            return;
          }
          assert(false);
        });

    it("Should Not allow to start session if it not in CREATED state ", async () =>{
      try{
        // now the contract is not in CREATED state 
        // because we already done startSession() function in previous unit test.
        await auctionInstance.startSession({from:accounts[0]}); 
      }catch(e){
        assert(e.message.includes("invalid state"));
        return;
      }
      assert(false);
    });
  });


  describe("Bid function", function(){

    it("All bidders can bid", async () =>{
      await auctionInstance.bid(56, {from:accounts[1]});
      await auctionInstance.bid(65, {from:accounts[2]});
      await auctionInstance.bid(75, {from:accounts[3]});
      await auctionInstance.bid(80, {from:accounts[4]});
      const current_price = await auctionInstance.currentPrice();
      assert.equal(current_price, 80);
    });

    it("The price have to higher than currentPirce + minimumStep", async () => {
      try {
        await auctionInstance.bid(83, {from:accounts[1]});
      } catch (error) {
        assert(error.message.includes("price invalid"));
        return;
      }
        assert(false);
    });

    it("Should NOT bid with non price", async () => {
      try {
        await auctionInstance.bid({from:accounts[2]});
      } catch (error) {
        assert(error.reason.includes('invalid BigNumber value'));
        return;
      }
      assert(false);
    });
  });

  describe("Announce", function() {
    it("Should not allow non Auctioneer to announce", async () =>{
      try {
        await auctionInstance.announce({from:accounts[1]});
      } catch (error) {
        assert(error.message.includes("Only auctioneer can call this."));
        return;
      }
      assert(false);
    });

    it("After 3 times calling function announce, the session would end", async () =>{
      await auctionInstance.announce({from:accounts[0]});
      await auctionInstance.announce({from:accounts[0]});
      await auctionInstance.announce({from:accounts[0]});
      await auctionInstance.announce({from:accounts[0]});
      const announcementTimes = await auctionInstance.announcementTimes();
      expect(announcementTimes.toNumber()).to.equal(4);
      const state = await auctionInstance.state();
      expect(state.toNumber()).to.equal(2);
    });

    it("Only announce in the STARTED state", async () => {
      try {
        await auctionInstance.announce({from:accounts[0]});
      } catch (error) {
        assert(error.message.includes("invalid state"));
        return;
      }
      assert(false);
    });

    it("Must to bid in the STARTED state", async () => {
      try {
        await auctionInstance.bid(100, {from:accounts[3]});
      } catch (error) {
        assert(error.message.includes("invalid state"));
        return;
      }
      assert(false);
    });
    
    it('Should have a winner', async () => {
      const winner = await auctionInstance.currentWinner();
      expect(winner).to.equal(accounts[4]);
    });
  });

  describe("Get Deposit", function() {

    it('winner cant withdraw the deposit', async () => {
      try {
        await auctionInstance.getDeposit({from:accounts[4]});
      } catch (error) {
        assert(error.message.includes('winner can not withdraw their deposit'));
        return;
      }
      assert(false);
    });

    it("all bidders can withdraw their deposit except winner", async () => {
      await auctionInstance.getDeposit({from:accounts[1]});
      await auctionInstance.getDeposit({from:accounts[2]});
      await auctionInstance.getDeposit({from:accounts[3]});

      const deposits = [];
      const bidders = [];
      for(let i = 1; i <= 3; i++){
        bidders[i] = await auctionInstance.bidders(accounts[i]);
        deposits[i] = await bidders[i].deposit;
      }
      assert.equal(deposits[1].toString(), "0" );
      assert.equal(deposits[2].toString(), "0" );
      assert.equal(deposits[3].toString(), "0" );    
    });

    it("must to get deposit on CLOSING state", async () => {
      try {
        await auctionInstance.getDeposit({from:accounts[3]}); 
      } catch (error) {
        assert(error.message.includes("invalid state"));
        return; 
      }
      assert(false);
    });


  });


});