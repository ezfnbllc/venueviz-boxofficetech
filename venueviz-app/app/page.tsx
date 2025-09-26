'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Users, TrendingUp, Sparkles, ArrowRight, Play } from 'lucide-react'
import { motion } from 'framer-motion'

export default function HomePage() {
  const [email, setEmail] = useState('')

  const features = [
    { icon: Sparkles, title: 'AI-Powered Insights', desc: 'Dynamic pricing and demand forecasting' },
    { icon: Users, title: 'Customer Analytics', desc: 'Deep insights into buyer behavior' },
    { icon: MapPin, title: '3D Venue Design', desc: 'Interactive venue visualization' },
    { icon: TrendingUp, title: 'Revenue Optimization', desc: 'Maximize earnings with AI' }
  ]

  const stats = [
    { value: '500K+', label: 'Tickets Sold' },
    { value: '98%', label: 'Satisfaction' },
    { value: '150+', label: 'Venues' },
    { value: '24/7', label: 'AI Support' }
  ]

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                VenueViz
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/events" className="text-gray-300 hover:text-white px-3 py-2">Events</Link>
              <Link href="/venues" className="text-gray-300 hover:text-white px-3 py-2">Venues</Link>
              <Link href="/box-office" className="text-gray-300 hover:text-white px-3 py-2">Box Office</Link>
              <Link href="/admin" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg">
                Admin Portal
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                AI-Powered Venue Management
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Transform your venue operations with intelligent ticketing, dynamic pricing, 
              and predictive analytics. Join the future of entertainment management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/box-office" className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 rounded-lg font-semibold text-white hover:opacity-90 transition-opacity flex items-center justify-center">
                Get Started <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <button className="bg-white/10 backdrop-blur px-8 py-4 rounded-lg font-semibold text-white hover:bg-white/20 transition-colors flex items-center justify-center">
                <Play className="mr-2 w-5 h-5" /> Watch Demo
              </button>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass p-6 rounded-xl"
              >
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-12">Powered by Advanced AI</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass p-6 rounded-xl hover:scale-105 transition-transform"
              >
                <feature.icon className="w-12 h-12 text-purple-400 mb-4" />
                <h4 className="text-xl font-semibold mb-2">{feature.title}</h4>
                <p className="text-gray-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center glass p-12 rounded-2xl">
          <h3 className="text-3xl font-bold mb-4">Ready to Transform Your Venue?</h3>
          <p className="text-gray-300 mb-8">
            Join hundreds of venues already using VenueViz to optimize their operations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400"
            />
            <button className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 rounded-lg font-semibold">
              Start Free Trial
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
