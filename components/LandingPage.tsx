
import React from 'react';

interface LandingPageProps {
  onLoginClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="text-xl font-bold tracking-wider">NAUTILUS<span className="text-blue-500">INTEL</span></span>
        </div>
        <button 
            onClick={onLoginClick}
            className="px-5 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/10"
        >
            Login Access
        </button>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 md:py-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-medium mb-8">
            <span className="animate-pulse w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            Next Gen Shipping Intelligence
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white via-blue-100 to-blue-500 text-transparent bg-clip-text">
            Navigate the Future <br/> of Global Logistics
        </h1>
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
            Uncover hidden patterns in trade lanes, identify top shippers, and manage data integrity with our AI-powered analytics platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
            <button 
                onClick={onLoginClick}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-600/30 transition-all transform hover:-translate-y-1"
            >
                Get Started
            </button>
            <button className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-all border border-slate-700">
                View Documentation
            </button>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-slate-950 py-24">
        <div className="container mx-auto px-6">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
                <p className="text-slate-400">Everything you need to master your supply chain data.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                    {
                        title: 'Shipper Analysis',
                        desc: 'Deep dive into shipper performance, volume trends, and preferred carriers.',
                        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                    },
                    {
                        title: 'Trade Lane Maps',
                        desc: 'Visualize flow from origin to destination with our interactive geospatial engine.',
                        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    },
                    {
                        title: 'Data Integrity',
                        desc: 'Automated deduplication and fuzzy matching to ensure clean, reliable data sets.',
                        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    },
                    {
                        title: 'Contact CRM',
                        desc: 'Manage KYC details, Geo-coordinates, and compliance info for all your partners.',
                        icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                    }
                ].map((item, idx) => (
                    <div key={idx} className="bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-blue-500/50 transition-colors group">
                        <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                            <svg className="w-6 h-6 text-blue-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {item.icon}
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 bg-slate-950 text-center text-slate-500 text-sm">
        <p>&copy; 2024 Nautilus Intelligence. All rights reserved.</p>
      </footer>
    </div>
  );
};
