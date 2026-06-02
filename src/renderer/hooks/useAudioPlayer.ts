import { useState, useRef, useCallback, useEffect } from 'react'

interface AudioPlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isLoading: boolean
  error: string | null
}

interface AudioPlayerControls {
  play: (dataUrl: string) => Promise<void>
  pause: () => void
  stop: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  getWaveformData: (dataUrl: string) => Promise<number[]>
}

export function useAudioPlayer(): AudioPlayerState & AudioPlayerControls {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const startTimeRef = useRef(0)
  const offsetRef = useRef(0)
  const animationFrameRef = useRef<number | null>(null)
  const isPlayingRef = useRef(false)

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    return audioContextRef.current
  }, [])

  const updateTime = useCallback(() => {
    if (isPlayingRef.current && audioContextRef.current) {
      const elapsed = audioContextRef.current.currentTime - startTimeRef.current + offsetRef.current
      setCurrentTime(Math.min(elapsed, duration))
      animationFrameRef.current = requestAnimationFrame(updateTime)
    }
  }, [duration])

  const play = useCallback(async (dataUrl: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const ctx = getAudioContext()

      // Stop current playback if any
      if (sourceRef.current) {
        sourceRef.current.stop()
        sourceRef.current.disconnect()
      }

      // Fetch and decode audio
      const response = await fetch(dataUrl)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)

      audioBufferRef.current = audioBuffer
      setDuration(audioBuffer.duration)

      // Create source and gain node
      const source = ctx.createBufferSource()
      const gainNode = ctx.createGain()

      source.buffer = audioBuffer
      gainNode.gain.value = volume

      source.connect(gainNode)
      gainNode.connect(ctx.destination)

      sourceRef.current = source
      gainNodeRef.current = gainNode

      // Start playback
      source.start(0, offsetRef.current)
      startTimeRef.current = ctx.currentTime
      isPlayingRef.current = true
      setIsPlaying(true)
      setIsLoading(false)

      // Handle playback end
      source.onended = () => {
        isPlayingRef.current = false
        setIsPlaying(false)
        setCurrentTime(0)
        offsetRef.current = 0
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }

      // Start time update loop
      animationFrameRef.current = requestAnimationFrame(updateTime)
    } catch (err) {
      setError((err as Error).message)
      setIsLoading(false)
    }
  }, [getAudioContext, volume, updateTime])

  const pause = useCallback(() => {
    if (sourceRef.current && isPlayingRef.current) {
      const ctx = getAudioContext()
      offsetRef.current = ctx.currentTime - startTimeRef.current + offsetRef.current
      sourceRef.current.stop()
      sourceRef.current.disconnect()
      sourceRef.current = null
      isPlayingRef.current = false
      setIsPlaying(false)

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [getAudioContext])

  const stop = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.stop()
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    isPlayingRef.current = false
    setIsPlaying(false)
    setCurrentTime(0)
    offsetRef.current = 0

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  const seek = useCallback((time: number) => {
    const wasPlaying = isPlayingRef.current
    if (sourceRef.current && isPlayingRef.current) {
      sourceRef.current.stop()
      sourceRef.current.disconnect()
      sourceRef.current = null
      isPlayingRef.current = false
    }

    offsetRef.current = time
    setCurrentTime(time)

    if (wasPlaying && audioBufferRef.current) {
      // Restart playback from new position
      const ctx = getAudioContext()
      const source = ctx.createBufferSource()
      const gainNode = gainNodeRef.current || ctx.createGain()

      source.buffer = audioBufferRef.current
      source.connect(gainNode)
      gainNode.connect(ctx.destination)

      sourceRef.current = source
      source.start(0, time)
      startTimeRef.current = ctx.currentTime
      isPlayingRef.current = true
      setIsPlaying(true)

      source.onended = () => {
        isPlayingRef.current = false
        setIsPlaying(false)
        setCurrentTime(0)
        offsetRef.current = 0
      }

      animationFrameRef.current = requestAnimationFrame(updateTime)
    }
  }, [getAudioContext, updateTime])

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume)
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVolume
    }
  }, [])

  const getWaveformData = useCallback(async (dataUrl: string): Promise<number[]> => {
    try {
      const ctx = getAudioContext()
      const response = await fetch(dataUrl)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer)

      const rawData = audioBuffer.getChannelData(0)
      const samples = 100
      const blockSize = Math.floor(rawData.length / samples)
      const filteredData: number[] = []

      for (let i = 0; i < samples; i++) {
        let sum = 0
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[i * blockSize + j])
        }
        filteredData.push(sum / blockSize)
      }

      // Normalize
      const max = Math.max(...filteredData)
      return filteredData.map(d => d / max)
    } catch {
      return []
    }
  }, [getAudioContext])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        sourceRef.current.stop()
        sourceRef.current.disconnect()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    isLoading,
    error,
    play,
    pause,
    stop,
    seek,
    setVolume,
    getWaveformData,
  }
}
