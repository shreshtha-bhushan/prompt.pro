"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Cloud, Sun, CloudRain } from "lucide-react"
import { getWeather } from "@/lib/weather"

export function WeatherWidget() {
  const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null)

  useEffect(() => {
    getWeather().then(w => {
      if (w) setWeather(w)
    })
  }, [])

  if (!weather) return null

  const WeatherIcon = weather.condition === "Clear" ? Sun : weather.condition?.includes("Rain") || weather.condition?.includes("Showers") ? CloudRain : Cloud

  return (
    <div className="flex items-center gap-2 text-[14px] text-[--text-secondary]">
      <WeatherIcon className="w-4 h-4" />
      <span>{weather.temp}°C {weather.condition}</span>
    </div>
  )
}
