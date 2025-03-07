import React from 'react'
import axios from "axios";
import { useNavigate } from 'react-router-dom';
import { useContext, useState, useEffect } from "react";
import { serverbaseURL } from "../constant/index";
import { AuthContext } from '../provider/AuthProvider';
import { motion } from 'framer-motion';
import { Check, } from 'lucide-react';
// Fix the import at the top
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

export default function Pricing() {
    const [loading, setLoading] = useState(false);
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [scriptLoaded, setScriptLoaded] = useState(false);
    const { user } = useContext(AuthContext);
    const [userDetails, setUserDetails] = useState(null);
    const [error, setError] = useState('');
    const [subscriptionMessage, setSubscriptionMessage] = useState('');
    const [subLoading, setSubLoading] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);

    const navigate = useNavigate();



    // Fetch user details when component mounts
    useEffect(() => {
        const fetchUserDetails = async () => {
            try {
                const response = await axios.get(`${serverbaseURL}api/user-subscription/${user.uid}`);


                setUserDetails(response.data);
            } catch (error) {
                console.error("Error fetching user details:", error);
            }
        };
        if (user?.uid) {
            fetchUserDetails();
        }
    }, [user]);

    // // Dynamically load Razorpay script
    // useEffect(() => {
    //     const loadScript = () => {
    //         const script = document.createElement('script');
    //         script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    //         script.async = true;
    //         script.onload = () => setScriptLoaded(true);
    //         script.onerror = () => setError('Failed to load Razorpay SDK');
    //         document.body.appendChild(script);
    //     };
    //     if (!window.Razorpay) {
    //         loadScript();
    //     } else {
    //         setScriptLoaded(true);
    //     }
    // }, []);

    // Update useEffect for script loading
    useEffect(() => {
        let script;
        if (!window.Razorpay) {
            script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => setScriptLoaded(true);
            script.onerror = () => setError('Failed to load payment gateway');
            document.body.appendChild(script);
        }
        return () => {
            if (script) document.body.removeChild(script);
        };
    }, []);


    // Updated handleSubscription function
    const handleSubscription = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data } = await axios.post(`${serverbaseURL}api/create-subscription`, {
                plan_id: "plan_Q3kT6VgdpJ1ZMn",
                total_count: 36
            });
            console.log("data", data)

            const options = {
                key: "rzp_live_k9cKl94apbk7aE",
                subscription_id: data.id,
                name: 'AutoMovieCreator',
                description: `Subscription for membership`,
                image: "https://papayacoders.com/demo.png",
                handler: async (response) => {
                    console.log("Payment Response from Razorpay:", response);
                    try {
                        await axios.post(`${serverbaseURL}api/verify-payment`, {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_subscription_id: response.razorpay_subscription_id,
                            razorpay_signature: response.razorpay_signature,
                            plan_id: "plan_Q3kT6VgdpJ1ZMn",
                            planName: "Discourse Membership",
                            money: 1310,
                            email: user.email,
                        });
                        console.log("Payment verified successfully!");
                        setSubscriptionStatus('success');
                        setSubscriptionMessage('Subscription activated successfully! Your account will be updated shortly.');

                        // Refresh user details
                        const userResponse = await axios.get(`${serverbaseURL}api/user-subscription/${user.uid}`);

                        setUserDetails(userResponse.data);
                        // Add redirect after 2 seconds to allow state updates
                        setTimeout(() => {
                            navigate('/create-community');
                        }, 2000);


                    } catch (err) {
                        console.error("Payment Verification Error:", err.response ? err.response.data : err);
                        setSubscriptionStatus('error');
                        setSubscriptionMessage(err.response?.data?.error || 'Payment verification failed. Please contact support.');
                    }
                }
                ,
                prefill: {
                    name: user.displayName,
                    email: user.email,
                    // contact: ''
                },
                theme: { color: '#3399cc' },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (response) => {
                setSubscriptionStatus('error');
                setSubscriptionMessage(response.error.description || 'Payment failed. Please try again.');
            });
            rzp.open();

        } catch (err) {
            setSubscriptionStatus('error');
            setSubscriptionMessage(err.response?.data?.error || 'Payment initialization failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };


    // New function: Cancel Subscription
    const handleCancelSubscription = async () => {
        if (!user || !userDetails?.subscriptionId) {
            alert("No active subscription to cancel.");
            return;
        }

        if (!window.confirm("Are you sure you want to cancel your subscription?")) {
            return;
        }

        setCancelLoading(true);
        try {
            const { data } = await axios.post(`${serverbaseURL}api/cancel-subscription`, {
                subscriptionId: userDetails.subscriptionId,
                email: user.email,
            });
            console.log("Cancellation Response:", data);
            setSubscriptionStatus('success');
            setSubscriptionMessage("Subscription cancelled successfully.");

            // Refresh user details after cancellation
            const userResponse = await axios.get(`${serverbaseURL}api/user-subscription/${user.uid}`);
            setUserDetails(userResponse.data);
        } catch (err) {
            console.error("Cancellation Error:", err.response ? err.response.data : err);
            setSubscriptionStatus('error');
            setSubscriptionMessage(err.response?.data?.error || 'Cancellation failed. Please try again.');
        } finally {
            setCancelLoading(false);
        }
    };


    // Update the SubscriptionModal component
    // Modal Component for subscription success/error messages
    const SubscriptionModal = () => (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full mx-4">
                <div className="flex flex-col items-center">
                    {subscriptionStatus === 'success' ? (
                        <FaCheckCircle className="text-4xl text-green-500 mb-4" />
                    ) : (
                        <FaTimesCircle className="text-4xl text-red-500 mb-4" />
                    )}
                    <h2 className="text-2xl font-bold mb-4">
                        {subscriptionStatus === 'success' ? 'Success!' : 'Error!'}
                    </h2>
                    <p className="text-gray-700 mb-6 text-center">{subscriptionMessage}</p>
                    <button
                        className={`px-4 py-2 rounded-lg ${subscriptionStatus === 'success'
                            ? 'bg-green-500 hover:bg-green-600'
                            : 'bg-red-500 hover:bg-red-600'
                            } text-white transition-colors`}
                        onClick={() => setSubscriptionStatus(null)}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className='min-h-screen bg-white '>
            <div className="min-w-full flex  items-center justify-center gap-28 pt-10">
                {/* <div className="pt-20 px-5 ml-5 mb-2 pb-5">
                    <GradientHeading text="CURRENT PLAN" />
                </div> */}

                {/* Discourse member */}
                <div className=" flex p-6 w-1/4 text-white">
                    <div className="relative z-10 border-2 border-[#805af5] rounded-xl bg-[#f8f8ff] p-8 h-full shadow-lg hover:shadow-2xl hover:border-[#0d6efd]">
                        <div className="flex flex-col">
                            <p className="text-black text-[32px] leading-tight block text-center bg-opacity-100 pb-1 font-serif">Discourse Membership</p>

                            <p className="mt-2 text-center  font-bold text-gray-500 text-3xl line-through">₹8715</p>
                            <p className="mt-2 pt-1 text-center text-5xl font-extrabold text-black">₹2615</p>
                            <p className="pt-1 text-center text-lg text-gray-500">per month (after 70% off)</p>

                            <div className="mt-6">
                            </div>

                            <div className="mt-5">
                                <div className="flex items-start mb-20 mt-4">
                                    <Check className="h-10 w-10 text-green-600 mt-1" />
                                    <p className="text-[#55595c] text-[15px] leading-[1.67] font-[500] ml-2">
                                        Get a Discourse membership for just ₹2615 per month after a 70% discount. We provide a fully hosted and automated community, so you don’t have to worry about setup or management.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleSubscription}
                                disabled={!scriptLoaded || loading}
                                className={`bg-gradient-to-r ${loading || !scriptLoaded
                                    ? 'from-gray-400 to-gray-500 cursor-not-allowed'
                                    : 'from-[#805af5] to-[#cd99ff] hover:from-[#6a3ec2] hover:to-[#a68cfc] '
                                    } text-white font-medium sm:text-lg py-2 sm:py-2 px-3 sm:px-4 rounded-lg w-full leading-[40px] tracking-[0.5px] border-0 text-center inline-block hover:scale-105`}
                            >
                                {loading ? 'Processing...' : 'Subscribe Now'}
                            </button>
                            
                            {userDetails?.subscriptionStatus === 'active' && (
                                <button
                                    onClick={handleCancelSubscription}
                                    disabled={cancelLoading}
                                    className="mt-4 bg-red-500 hover:bg-red-600 text-white font-medium sm:text-lg py-2 px-3 rounded-lg w-full transition-colors"
                                >
                                    {cancelLoading ? 'Processing...' : 'Cancel Subscription'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>



                <div className=" w-1/3 px-5">
                    <div className="px-5">
                        <motion.div className="bg-[#805af5] max-w-2xl px-8 py-10 md:px-16 shadow-xl rounded-lg"
                            initial={{ opacity: 0, x: 1000, scale: 0.95 }} // Starts off-screen to the left with slight scale down
                            animate={{ opacity: 1, x: 0, scale: 1 }} // Animates to full opacity and position with scale up
                            transition={{
                                duration: 0.4, // Duration for smooth transition
                                ease: 'easeInOut', // Smooth easing function for smooth and natural animation
                                delay: 0.1, // A slight delay for a more fluid effect
                            }}
                        >
                            <p className="text-lg text-white">
                                <span className="font-bold">Current Plan:</span> {userDetails?.plan ? userDetails.plan : 'No active plan'}
                            </p>
                            <p className="text-lg text-white">
                                <span className="font-bold">Membership Status:</span> {userDetails?.subscriptionStatus || "No active "}
                            </p>

                            {/* <p className="text-lg text-white">
                <span className="font-bold">Last Reset:</span> {userDetails?.lastVideoReset
                  ? new Date(userDetails.lastVideoReset).toLocaleDateString()
                  : 'N/A'}
              </p> */}
                            {/* <p className="text-lg text-white">
                                <span className="font-bold">Status:</span> {userDetails?.status || 'Loading...'}
                            </p> */}
                        </motion.div>
                    </div>

                </div>



                {/* Modal */}
                {subscriptionStatus && <SubscriptionModal />}
            </div>
        </div>
    )
}
