var express = require("express");
var router  = express.Router();
var passport = require("passport");
var User = require("../models/user");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { isLoggedIn, isPaid } = require("../middleware");

//root route
router.get("/", function(req, res){
    res.render("landing");
});

// show register form
router.get("/register", function(req, res){
   res.render("register"); 
});

//handle sign up logic
router.post("/register", function(req, res){
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            req.flash("error", err.message);
            return res.redirect("/register");
        }
        passport.authenticate("local")(req, res, function(){
           req.flash("success", "Welcome to YelpCamp " + user.username);
           res.redirect("/campgrounds"); 
        });
    });
});

//show login form
router.get("/login", function(req, res){
   res.render("login"); 
});

//handling login logic
router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/campgrounds",
        failureRedirect: "/login"
    }), function(req, res){
});

// logout route
router.get("/logout", function(req, res){
   req.logout();
   req.flash("success", "Logged you out!");
   res.redirect("/");
});

// signup fee route
router.get("/signup-fee", isLoggedIn, function(req, res){
    if (req.user.isPaid) {
        req.flash('success', 'Your account is already paid');
        return res.redirect('/');
    }
    res.render("signupFee", { feeAmount: 20 });
});

// handle signup fee logic
router.post("/signup-fee", isLoggedIn, async function(req, res){
    const { paymentMethodId, items, currency } = req.body;
    
    const feeAmount = 2000;
    
    try {
        // Create new PaymentIntent with a PaymentMethod ID from the client.
        const intent = await stripe.paymentIntents.create({
            amount: feeAmount,
            currency: currency,
            payment_method: paymentMethodId,
            error_on_requires_action: true,
            confirm: true
        });
    
        console.log("💰 Payment received!");

        req.user.isPaid = true;
        await req.user.save();

        // The payment is complete and the money has been moved
        // You can add any post-payment code here (e.g. shipping, fulfillment, etc)
    
        // Send the client secret to the client to use in the demo
        res.send({ clientSecret: intent.client_secret });
    } catch (e) {
        // Handle "hard declines" e.g. insufficient funds, expired card, card authentication etc
        // See https://stripe.com/docs/declines/codes for more
        if (e.code === "authentication_required") {
            res.send({
                error: "This card requires authentication in order to proceeded. Please use a different card."
            });
        } else {
            res.send({ error: e.message });
        }
    }     
});

// get stripe key
router.get("/stripe-key", (req, res) => {
    res.send({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});



module.exports = router;