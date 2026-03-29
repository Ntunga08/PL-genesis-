import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useState, useEffect, useRef } from 'react';

export default function Home({ onSelectRole }) {
  const { isConnected } = useAccount();
  const [activeSection, setActiveSection] = useState('home');
  const [showStory, setShowStory] = useState(false);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const [statsAnimated, setStatsAnimated] = useState(false);
  const statsRef = useRef(null);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );

    const sections = document.querySelectorAll('section[id]');
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [showStory]);

  // Stats counter animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !statsAnimated) {
          setStatsAnimated(true);
        }
      },
      { threshold: 0.5 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, [statsAnimated]);

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Animated counter component
  const AnimatedCounter = ({ end, duration = 2000, suffix = '' }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (!statsAnimated) return;

      let startTime;
      const animate = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        
        if (typeof end === 'number') {
          setCount(Math.floor(progress * end));
        } else {
          setCount(end);
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, [statsAnimated, end, duration]);

    return <>{typeof end === 'number' ? count + suffix : end}</>;
  };

  return (
    <div className="min-h-screen">
      {/* Navigation Bar */}
      {!isConnected && (
        <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-sm z-50 border-b border-slate-200 transition-smooth">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 animate-fade-in">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center animate-pulse-glow">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-slate-800">HealthLink</span>
              </div>
              
              <div className="hidden md:flex items-center gap-8">
                <button 
                  onClick={() => scrollToSection('home')}
                  className={`text-sm font-medium transition-all duration-300 relative group ${
                    activeSection === 'home' ? 'text-teal-600' : 'text-slate-600 hover:text-teal-600'
                  }`}
                >
                  Home
                  <span className={`absolute -bottom-1 left-0 h-0.5 bg-teal-600 transition-all duration-300 ${
                    activeSection === 'home' ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}></span>
                </button>
                <button 
                  onClick={() => scrollToSection('about')}
                  className={`text-sm font-medium transition-all duration-300 relative group ${
                    activeSection === 'about' ? 'text-teal-600' : 'text-slate-600 hover:text-teal-600'
                  }`}
                >
                  About
                  <span className={`absolute -bottom-1 left-0 h-0.5 bg-teal-600 transition-all duration-300 ${
                    activeSection === 'about' ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}></span>
                </button>
                <button 
                  onClick={() => scrollToSection('vision')}
                  className={`text-sm font-medium transition-all duration-300 relative group ${
                    activeSection === 'vision' ? 'text-teal-600' : 'text-slate-600 hover:text-teal-600'
                  }`}
                >
                  Vision & Mission
                  <span className={`absolute -bottom-1 left-0 h-0.5 bg-teal-600 transition-all duration-300 ${
                    activeSection === 'vision' ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}></span>
                </button>
              </div>

              <div className="flex items-center animate-fade-in delay-200">
                <ConnectButton />
              </div>
            </div>
          </div>
        </nav>
      )}


      {!isConnected ? (
        <div className="pt-20">
          {showStory ? (
            /* Problem & Solution Story */
            <section className="min-h-screen flex items-center justify-center px-6 py-20">
              <div className="max-w-6xl mx-auto">
                <button 
                  onClick={() => setShowStory(false)}
                  className="mb-8 flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium transition-all duration-300 hover:gap-3 animate-fade-in"
                >
                  <svg className="w-5 h-5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Home
                </button>

                <div className="text-center mb-16 animate-fade-in-up">
                  <h2 className="text-4xl font-bold text-slate-900 mb-4">What Drove Us to Build HealthLink</h2>
                  <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    Understanding the problem and our innovative solution
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-12 items-start">
                  <div className="space-y-6 animate-slide-in-left">
                    <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-200 hover-lift">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-red-100 rounded-xl transition-transform duration-300 hover:scale-110">
                          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">The Problem</h3>
                      </div>
                      <div className="space-y-4 text-slate-600 leading-relaxed">
                        <p>
                          Medical records are fragmented across hospitals, clinics, and countries. When patients travel, 
                          study abroad, or seek refuge in new countries, their medical history doesn't follow them.
                        </p>
                        <p className="font-semibold text-slate-700">Who suffers the most?</p>
                        <ul className="space-y-2 ml-4">
                          <li className="flex items-start gap-2 transition-transform duration-300 hover:translate-x-2">
                            <span className="text-red-600 mt-1">•</span>
                            <span><strong>Refugees</strong> fleeing conflict without access to their medical records</span>
                          </li>
                          <li className="flex items-start gap-2 transition-transform duration-300 hover:translate-x-2">
                            <span className="text-red-600 mt-1">•</span>
                            <span><strong>International students</strong> needing healthcare in foreign countries</span>
                          </li>
                          <li className="flex items-start gap-2 transition-transform duration-300 hover:translate-x-2">
                            <span className="text-red-600 mt-1">•</span>
                            <span><strong>Medical tourists</strong> seeking treatment across borders</span>
                          </li>
                          <li className="flex items-start gap-2 transition-transform duration-300 hover:translate-x-2">
                            <span className="text-red-600 mt-1">•</span>
                            <span><strong>Travelers</strong> facing medical emergencies away from home</span>
                          </li>
                          <li className="flex items-start gap-2 transition-transform duration-300 hover:translate-x-2">
                            <span className="text-red-600 mt-1">•</span>
                            <span><strong>Expatriates</strong> living and working in different countries</span>
                          </li>
                        </ul>
                        <p className="pt-4 border-t border-slate-200">
                          Traditional systems are centralized, vulnerable to data breaches, and patients have 
                          <strong> zero control</strong> over who accesses their sensitive medical information.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 animate-slide-in-right">
                    <div className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl p-8 shadow-xl text-white hover-lift animate-gradient">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-white/20 rounded-xl transition-transform duration-300 hover:scale-110">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-2xl font-bold">Our Solution</h3>
                      </div>
                      <div className="space-y-4 text-teal-50 leading-relaxed">
                        <p>
                          HealthLink leverages <strong className="text-white">blockchain technology</strong> to give patients 
                          complete ownership and control of their medical records.
                        </p>
                        <p className="font-semibold text-white">How it works:</p>
                        <ul className="space-y-3 ml-4">
                          <li className="flex items-start gap-2 transition-transform duration-300 hover:translate-x-2">
                            <span className="text-cyan-300 mt-1">✓</span>
                            <span><strong className="text-white">Ethereum smart contracts</strong> enforce patient-controlled access permissions</span>
                          </li>
                          <li className="flex items-start gap-2 transition-transform duration-300 hover:translate-x-2">
                            <span className="text-cyan-300 mt-1">✓</span>
                            <span><strong className="text-white">IPFS storage</strong> keeps your encrypted records decentralized and secure</span>
                          </li>
                          <li className="flex items-start gap-2 transition-transform duration-300 hover:translate-x-2">
                            <span className="text-cyan-300 mt-1">✓</span>
                            <span><strong className="text-white">Instant access control</strong> - grant or revoke doctor permissions in seconds</span>
                          </li>
                          <li className="flex items-start gap-2 transition-transform duration-300 hover:translate-x-2">
                            <span className="text-cyan-300 mt-1">✓</span>
                            <span><strong className="text-white">QR code sharing</strong> for emergency access to your medical history</span>
                          </li>
                          <li className="flex items-start gap-2 transition-transform duration-300 hover:translate-x-2">
                            <span className="text-cyan-300 mt-1">✓</span>
                            <span><strong className="text-white">Global accessibility</strong> - your records travel with you anywhere</span>
                          </li>
                        </ul>
                        <p className="pt-4 border-t border-teal-400">
                          No more lost records. No more repeated tests. No more privacy concerns. 
                          <strong className="text-white"> You own your health data.</strong>
                        </p>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200 hover-lift">
                      <p className="text-sm text-blue-900 leading-relaxed">
                        <strong>Real Impact:</strong> Whether you're a refugee seeking asylum, a student studying abroad, 
                        or a traveler facing a medical emergency, HealthLink ensures your complete medical history is 
                        always accessible, secure, and under your control.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center mt-12 animate-fade-in-up delay-400">
                  <button 
                    onClick={() => setShowStory(false)}
                    className="px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-2xl transition-all duration-300 hover:scale-105 animate-gradient"
                  >
                    Get Started with HealthLink
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <>
          {/* Hero Section */}
          <section id="home" className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-20 left-10 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
              <div className="absolute top-40 right-10 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float delay-200"></div>
              <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float delay-400"></div>
            </div>

            <div className="max-w-6xl mx-auto text-center relative z-10">
              <div className={`inline-block p-4 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-2xl mb-6 ${
                visibleSections.has('home') ? 'animate-scale-in' : 'opacity-0'
              }`}>
                <svg className="w-16 h-16 text-teal-600 animate-float" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </div>
              
              <h1 className={`text-5xl md:text-6xl font-bold text-slate-900 mb-6 ${
                visibleSections.has('home') ? 'animate-fade-in-up delay-100' : 'opacity-0'
              }`}>
                Your Health, <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-600 animate-gradient">Your Control</span>
              </h1>
              
              <p className={`text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed ${
                visibleSections.has('home') ? 'animate-fade-in-up delay-200' : 'opacity-0'
              }`}>
                Complete control over your medical records - whether changing hospitals, visiting specialists, 
                managing chronic conditions, or traveling the world. Secure, accessible, and always yours.
              </p>
              
              <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 ${
                visibleSections.has('home') ? 'animate-fade-in-up delay-300' : 'opacity-0'
              }`}>
                <div className="transform transition-all duration-300 hover:scale-105">
                  <ConnectButton />
                </div>
                <button 
                  onClick={() => scrollToSection('about')}
                  className="px-6 py-3 border-2 border-teal-600 text-teal-600 rounded-lg font-medium hover:bg-teal-50 transition-all duration-300 hover:shadow-lg hover:scale-105"
                >
                  Learn More
                </button>
              </div>

              <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-16">
                <div className={`bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover-lift ${
                  visibleSections.has('home') ? 'animate-fade-in-up delay-400' : 'opacity-0'
                }`}>
                  <div className="text-3xl font-bold text-teal-600 mb-2">
                    <AnimatedCounter end={100} suffix="+" />
                  </div>
                  <div className="text-sm text-slate-600">Supported Wallets</div>
                </div>
                <div className={`bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover-lift ${
                  visibleSections.has('home') ? 'animate-fade-in-up delay-500' : 'opacity-0'
                }`}>
                  <div className="text-3xl font-bold text-cyan-600 mb-2">
                    <AnimatedCounter end={8} />
                  </div>
                  <div className="text-sm text-slate-600">Record Types</div>
                </div>
                <div className={`bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover-lift ${
                  visibleSections.has('home') ? 'animate-fade-in-up delay-600' : 'opacity-0'
                }`}>
                  <div className="text-3xl font-bold text-blue-600 mb-2">24/7</div>
                  <div className="text-sm text-slate-600">Global Access</div>
                </div>
                <div className={`bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover-lift ${
                  visibleSections.has('home') ? 'animate-fade-in-up delay-700' : 'opacity-0'
                }`}>
                  <div className="text-3xl font-bold text-teal-600 mb-2">∞</div>
                  <div className="text-sm text-slate-600">Decentralized</div>
                </div>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section id="about" className="min-h-screen flex items-center justify-center px-6 py-20 bg-gradient-to-br from-slate-50 to-teal-50 relative overflow-hidden">
            <div className="max-w-6xl mx-auto">
              <div className={`text-center mb-16 ${
                visibleSections.has('about') ? 'animate-fade-in-up' : 'opacity-0'
              }`}>
                <h2 className="text-4xl font-bold text-slate-900 mb-4">About HealthLink</h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  Revolutionizing healthcare data management with blockchain technology
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className={`bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover-lift hover-glow transition-smooth ${
                  visibleSections.has('about') ? 'animate-fade-in-up delay-100' : 'opacity-0'
                }`}>
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-110 hover:rotate-6">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">Complete Patient Control</h4>
                  <p className="text-sm text-slate-600">
                    You own your medical records. Grant or revoke access to any healthcare provider instantly - whether your primary doctor, specialists, or emergency responders.
                  </p>
                </div>

                <div className={`bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover-lift hover-glow transition-smooth ${
                  visibleSections.has('about') ? 'animate-fade-in-up delay-200' : 'opacity-0'
                }`}>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-110 hover:rotate-6">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">Universal Access</h4>
                  <p className="text-sm text-slate-600">
                    Seamlessly transfer records between hospitals, share with specialists, access in emergencies, and yes - take them anywhere in the world.
                  </p>
                </div>

                <div className={`bg-white rounded-xl p-6 shadow-lg border border-slate-200 hover-lift hover-glow transition-smooth ${
                  visibleSections.has('about') ? 'animate-fade-in-up delay-300' : 'opacity-0'
                }`}>
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center mb-4 transition-transform duration-300 hover:scale-110 hover:rotate-6">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">Blockchain Security</h4>
                  <p className="text-sm text-slate-600">
                    Immutable, tamper-proof records secured by Ethereum smart contracts with encrypted IPFS storage. Your data is protected across all healthcare scenarios.
                  </p>
                </div>
              </div>

              {/* Practical Features Section */}
              <div className={`mt-20 ${
                visibleSections.has('about') ? 'animate-fade-in-up delay-400' : 'opacity-0'
              }`}>
                <div className="text-center mb-12">
                  <h3 className="text-3xl font-bold text-slate-900 mb-4">Everyday Healthcare Made Simple</h3>
                  <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    HealthLink is designed for real-world healthcare scenarios you face every day
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 hover-lift transition-smooth">
                    <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">Hospital Transfers</h4>
                    <p className="text-sm text-slate-600">
                      Seamlessly move your complete medical history when changing healthcare providers
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 hover-lift transition-smooth">
                    <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">Specialist Referrals</h4>
                    <p className="text-sm text-slate-600">
                      Share your complete health history with specialists instantly for better care
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 hover-lift transition-smooth">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">Emergency Access</h4>
                    <p className="text-sm text-slate-600">
                      Critical medical information available to emergency responders when seconds count
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 hover-lift transition-smooth">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">Medication Tracking</h4>
                    <p className="text-sm text-slate-600">
                      Keep track of all prescriptions and medication schedules in one secure place
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 hover-lift transition-smooth">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">Appointment Reminders</h4>
                    <p className="text-sm text-slate-600">
                      Never miss important medical appointments with integrated scheduling
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 hover-lift transition-smooth">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">Multi-Provider Care</h4>
                    <p className="text-sm text-slate-600">
                      Coordinate care seamlessly across multiple doctors and healthcare facilities
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 hover-lift transition-smooth">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">Chronic Disease Management</h4>
                    <p className="text-sm text-slate-600">
                      Long-term health tracking and monitoring for ongoing conditions
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-md border border-slate-200 hover-lift transition-smooth">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 mb-2">International Travel</h4>
                    <p className="text-sm text-slate-600">
                      Take your complete medical history anywhere in the world, anytime
                    </p>
                  </div>
                </div>
              </div>

              <div className={`mt-16 text-center ${
                visibleSections.has('about') ? 'animate-fade-in-up delay-500' : 'opacity-0'
              }`}>
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-8 border-2 border-teal-200 max-w-3xl mx-auto hover-lift transition-smooth">
                  <p className="text-lg text-slate-700 mb-6 leading-relaxed">
                    Curious about what inspired us to build HealthLink? Discover the real-world problems we're solving 
                    and how blockchain technology is transforming healthcare accessibility.
                  </p>
                  <button 
                    onClick={() => setShowStory(true)}
                    className="px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-2xl transition-all duration-300 inline-flex items-center gap-2 hover:scale-105 animate-gradient group"
                  >
                    <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Learn What Drove Us to Build This
                  </button>
                </div>
              </div>
            </div>
          </section>


          {/* Vision & Mission Section */}
          <section id="vision" className="min-h-screen flex items-center justify-center px-6 py-20">
            <div className="max-w-6xl mx-auto">
              <div className={`text-center mb-16 ${
                visibleSections.has('vision') ? 'animate-fade-in-up' : 'opacity-0'
              }`}>
                <h2 className="text-4xl font-bold text-slate-900 mb-4">Vision & Mission</h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  Building the future of patient-centered healthcare
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-16">
                <div className={`bg-gradient-to-br from-teal-600 to-cyan-600 rounded-2xl p-10 shadow-2xl text-white hover-lift animate-gradient ${
                  visibleSections.has('vision') ? 'animate-slide-in-left' : 'opacity-0'
                }`}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-white/20 rounded-xl transition-transform duration-300 hover:scale-110 hover:rotate-12">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold">Our Vision</h3>
                  </div>
                  <p className="text-teal-50 leading-relaxed text-lg">
                    A world where every patient owns their medical records and can access them anywhere, anytime. 
                    Where changing hospitals is seamless, specialist referrals are instant, and emergency care has immediate access to critical information. 
                    We envision healthcare without barriers - whether you're across town or across the world.
                  </p>
                </div>

                <div className={`bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-10 shadow-2xl text-white hover-lift animate-gradient ${
                  visibleSections.has('vision') ? 'animate-slide-in-right' : 'opacity-0'
                }`}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-white/20 rounded-xl transition-transform duration-300 hover:scale-110 hover:rotate-12">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold">Our Mission</h3>
                  </div>
                  <p className="text-blue-50 leading-relaxed text-lg">
                    Empower every patient with complete ownership and control of their medical records through blockchain technology. 
                    We make healthcare data accessible, secure, and portable for all scenarios - hospital transfers, specialist visits, 
                    emergency care, chronic disease management, and yes, international travel too.
                  </p>
                </div>
              </div>

              <div className={`bg-white rounded-2xl p-10 shadow-xl border border-slate-200 hover-lift ${
                visibleSections.has('vision') ? 'animate-fade-in-up delay-200' : 'opacity-0'
              }`}>
                <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">Core Values</h3>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="text-center group">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 hover-glow">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">Patient First</h4>
                    <p className="text-sm text-slate-600">
                      Every decision we make prioritizes patient privacy, control, and accessibility.
                    </p>
                  </div>

                  <div className="text-center group">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 hover-glow">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">Security & Privacy</h4>
                    <p className="text-sm text-slate-600">
                      Blockchain-verified access control with end-to-end encryption for all medical data.
                    </p>
                  </div>

                  <div className="text-center group">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 hover-glow">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">Global Access</h4>
                    <p className="text-sm text-slate-600">
                      Healthcare without borders - your records accessible anywhere, anytime.
                    </p>
                  </div>
                </div>
              </div>

              <div className={`text-center mt-12 ${
                visibleSections.has('vision') ? 'animate-fade-in delay-400' : 'opacity-0'
              }`}>
                <button 
                  onClick={() => scrollToSection('home')}
                  className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium transition-all duration-300 hover:gap-3 group"
                >
                  <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  Back to Top
                </button>
              </div>
            </div>
          </section>
            </>
          )}
        </div>
      ) : (
        /* Role Selection - shown after wallet connection */
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl shadow-2xl p-10 border border-slate-200 max-w-3xl w-full animate-scale-in">
            <h2 className="text-3xl font-bold text-slate-900 mb-3 text-center animate-fade-in-up">
              Welcome to HealthLink
            </h2>
            <p className="text-slate-600 mb-10 text-center animate-fade-in-up delay-100">
              Select your role to continue
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Patient */}
              <button 
                onClick={() => onSelectRole('patient')}
                className="group bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 p-10 rounded-2xl hover:border-teal-500 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 animate-fade-in-up delay-200"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-lg animate-pulse-glow">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 transition-colors duration-300 group-hover:text-teal-600">Patient</h3>
                <p className="text-sm text-slate-600">
                  View and manage your medical records, grant access to healthcare providers
                </p>
              </button>

              {/* Medical Staff */}
              <button 
                onClick={() => onSelectRole('attendant')}
                className="group bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 p-10 rounded-2xl hover:border-blue-500 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 animate-fade-in-up delay-300"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 shadow-lg animate-pulse-glow">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 transition-colors duration-300 group-hover:text-blue-600">Medical Staff</h3>
                <p className="text-sm text-slate-600">
                  Add and manage patient records, communicate with patients securely
                </p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
