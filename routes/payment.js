const express = require("express");
const { ObjectId } = require("mongodb");
const { getCollections } = require("../mongoConnection");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { sendEmail } = require("../utilities/mailer");
require("dotenv").config();
const User = require('../models/User'); // Add this at the top


// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});


router.post('/api/create-subscription', async (req, res) => {
    console.log("Received request to create subscription:");
    console.log("Request Body:", req.body);

    try {
        const { plan_id, total_count } = req.body; // Validate and sanitize these inputs!
        console.log(`Creating subscription with plan_id: ${plan_id} and total_count: ${total_count}`);
        // Create subscription on Razorpay
        const subscription = await razorpayInstance.subscriptions.create({
            plan_id,
            total_count,
            customer_notify: 1,
        });
        return res.json(subscription);
    } catch (error) {
        console.error("Error creating subscription:", error);
        if (error.response) {
            console.error("Error response data:", error.response.data);
            console.error("Error response status:", error.response.status);
        }
        return res.status(500).json({ error: error.message });
    }
});






router.post('/api/verify-payment', async (req, res) => {
    console.log('[1] Received verification request:', req.body);
    const {
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
        plan_id,
        email,
        money,
        planName,
    } = req.body;

    try {
        // Basic input validation
        console.log('[2] Validating inputs:');
        console.log('Payment ID:', razorpay_payment_id?.length ? '✅ Present' : '❌ Missing');
        console.log('Subscription ID:', razorpay_subscription_id?.length ? '✅ Present' : '❌ Missing');
        console.log('Signature:', razorpay_signature?.length ? '✅ Present' : '❌ Missing');

        if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
            console.error('[3] Missing required parameters');
            return res.status(400).json({ error: "Missing payment verification parameters" });
        }

        // Environment validation
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        console.log('[4] Environment check:', keySecret ? '✅ RAZORPAY_KEY_SECRET exists' : '❌ RAZORPAY_KEY_SECRET missing');

        if (!keySecret) {
            throw new Error("RAZORPAY_KEY_SECRET is missing in environment variables");
        }

        // Signature generation
        console.log('[5] Generating signature with:');
        console.log('Payment ID:', razorpay_payment_id);
        console.log('Subscription ID:', razorpay_subscription_id);

        const hmac = crypto.createHmac('sha256', keySecret);
        const signatureData = `${razorpay_payment_id}|${razorpay_subscription_id}`;
        hmac.update(signatureData);

        const generatedSignature = hmac.digest('hex');
        console.log('[6] Generated signature:', generatedSignature);
        console.log('Received signature:', razorpay_signature);

        // Signature validation
        console.log('[7] Comparing signatures:');
        try {
            const isSignatureValid = crypto.timingSafeEqual(
                Buffer.from(generatedSignature),
                Buffer.from(razorpay_signature)
            );
            console.log('[8] Signature match:', isSignatureValid ? '✅ Valid' : '❌ Invalid');

            if (isSignatureValid) {
                console.log('[9] Payment verification successful');

                // try {
                //     const subscription = await razorpayInstance.subscriptions.fetch(
                //         razorpay_subscription_id
                //     );
                // // Convert Unix timestamp to Date
                // const startDate = new Date(subscription.start_at * 1000);
                // const createdAt = new Date(subscription.created_at * 1000)

                const result = await await User.findOneAndUpdate(
                    { email: email },
                    {
                        $set: {
                            plan: planName,
                            subscriptionId: razorpay_subscription_id,
                            subscriptionDate: new Date(),
                            subscriptionStatus: 'active',

                        },
                        $push: {
                            payments: {
                                payment_id: razorpay_payment_id,
                                subscription_id: razorpay_subscription_id,
                                plan_id: plan_id,
                                amount: money,
                                plan: planName,
                                date: new Date(),
                            }
                        }
                    }
                );

                if (result.modifiedCount === 0) {
                    throw new Error("Failed to update user record");
                }

                // Update sendEmail content in verification route:
                sendEmail(
                    email,
                    'Subscription Activated Successfully',
                    `
                      <h3>Thank you for your purchase!</h3>
                      <p><strong>Plan Name:</strong> ${planName}</p>
                      <p><strong>Amount:</strong> ₹${money}</p>
                      <p><strong>Subscription ID:</strong> ${razorpay_subscription_id}</p>
                      <p>Your community hosting is now active. Start managing your community!</p>
                    `
                );
                return res.json({
                    status: "success",
                    message: "Subscription Activated Successfully. It's should be reflect on the screen after sometime",
                    debug: {
                        generatedSignature,
                        receivedSignature: razorpay_signature,
                        signatureData
                    }
                });
            }
        } catch (compareError) {
            console.error('[10] Signature comparison error:', compareError);
            console.log('Possible length mismatch:');
            console.log('Generated length:', generatedSignature.length);
            console.log('Received length:', razorpay_signature.length);
            throw new Error("Signature comparison failed");
        }

        console.error('[11] Invalid signature detected');
        return res.status(400).json({
            error: "Invalid signature",
            debug: {
                generatedSignature,
                receivedSignature: razorpay_signature,
                signatureData: `${razorpay_payment_id}|${razorpay_subscription_id}`
            }
        });

    } catch (error) {
        console.error('[12] Verification process failed:');
        console.error('Error message:', error.message);
        console.error('Stack trace:', error.stack);
        console.log('Current environment:', process.env.NODE_ENV);
        console.log('Key Secret exists:', !!process.env.RAZORPAY_KEY_SECRET);

        return res.status(500).json({
            error: error.message || "Payment verification failed",
            debugInfo: process.env.NODE_ENV === 'development' ? {
                stack: error.stack,
                receivedBody: req.body,
                env: {
                    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET ? '***** (exists)' : 'missing',
                    NODE_ENV: process.env.NODE_ENV
                }
            } : undefined
        });
    }
});


router.get('/api/user-subscription/:uid', async (req, res) => {
    console.log(req.params.uid)
    if (!req.params.uid) {
        return res.status(403).json({ error: "Unauthorized access" });
    }
    try {
        const user = await User.findOne(
            { uid: req.params.uid },
            {
                subscriptionStart: 1,
                subscriptionCreated: 1,
                subscriptionStatus: 1,
                plan: 1,
                subscriptionId: 1,
                payments: 1,
                _id: 0
            }
        ).lean();

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Format dates to ISO strings
        const response = {
            ...user,
            subscriptionStart: user.subscriptionStart?.toISOString(),
            subscriptionCreated: user.subscriptionCreated?.toISOString()
        };

        return res.json(response);

    } catch (error) {
        console.error('Error fetching subscription details:', error);
        return res.status(500).json({
            error: "Failed to fetch subscription details",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});


// Cancel Subscription Endpoint
router.post('/api/cancel-subscription', async (req, res) => {
    console.log("Cancel Subscription Endpoint called");
    console.log("Request Body:", req.body);

    const { subscriptionId, email } = req.body;

    if (!subscriptionId || !email) {
        console.error("Missing subscriptionId or email in request body");
        return res.status(400).json({ error: "Missing subscriptionId or email" });
    }

    console.log("Subscription ID:", subscriptionId);
    console.log("User Email:", email);

    try {
        console.log("Calling Razorpay cancellation API with subscriptionId:", subscriptionId);
        // Cancel the subscription immediately (set cancel_at_cycle_end: 0)
        const cancellationResponse = await razorpayInstance.subscriptions.cancel(subscriptionId, {
            cancel_at_cycle_end: 1  // Ensure this is the numeric value 0
        });
        console.log("Razorpay cancellation response:", cancellationResponse);

        // Check if the response status is 'cancelled'
        if (cancellationResponse.status !== 'cancelled') {
            console.warn("Razorpay response status is not 'cancelled'. It is:", cancellationResponse.status);
        }

        console.log("Updating user's subscription status in the database");
        // Update user's subscription status in your database
        const updatedUser = await User.findOneAndUpdate(
            { email: email },
            { $set: { subscriptionStatus: 'Your subscription has been cancelled and now more bill will charge after the end of next billing period' } },
            { new: true }
        );
        console.log("Database update successful. Updated user:", updatedUser);

        console.log("Sending cancellation confirmation email");
        // Send cancellation confirmation email
        sendEmail(
            email,
            "Subscription Cancelled",
            `
              <h3>Your subscription has been cancelled</h3>
              <p><strong>Subscription ID:</strong> ${subscriptionId}</p>
              <p>If you have any questions, please contact our support.</p>
            `
        );
        console.log("Cancellation confirmation email sent");

        return res.json({
            status: "success",
            message: "Subscription cancelled successfully.",
            razorpayResponse: cancellationResponse,
            user: updatedUser
        });
    } catch (error) {
        console.error("Error cancelling subscription:");
        console.error("Error message:", error.message);
        console.error("Stack trace:", error.stack);
        return res.status(500).json({ error: error.message });
    }
});


module.exports = router;
