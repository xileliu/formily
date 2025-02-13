import React from 'react'
import { Tracker } from '@formily/reactive'
import { GarbageCollector, immediate } from '../shared'
import { IObserverOptions } from '../types'
import { useForceUpdate } from './useForceUpdate'

class ObjectToBeRetainedByReact {}

function objectToBeRetainedByReactFactory() {
  return new ObjectToBeRetainedByReact()
}

export const useObserver = <T extends () => any>(
  view: T,
  options?: IObserverOptions
): ReturnType<T> => {
  const forceUpdate = useForceUpdate()
  const mountedRef = React.useRef(false)
  const trackerRef = React.useRef<Tracker>(null)
  const gcRef = React.useRef<GarbageCollector>()
  const [objectRetainedByReact] = React.useState(
    objectToBeRetainedByReactFactory
  )
  if (!trackerRef.current) {
    trackerRef.current = new Tracker(() => {
      if (typeof options?.scheduler === 'function') {
        options.scheduler(forceUpdate)
      } else {
        forceUpdate()
      }
    }, options?.displayName)
  }

  //StrictMode/ConcurrentMode会导致组件无法正确触发UnMount，所以只能自己做垃圾回收
  if (!gcRef.current) {
    gcRef.current = new GarbageCollector(() => {
      if (trackerRef.current) {
        trackerRef.current.dispose()
      }
    })
    gcRef.current.open(objectRetainedByReact)
  }

  React.useEffect(() => {
    const dispose = () => {
      if (trackerRef.current && !mountedRef.current) {
        trackerRef.current.dispose()
        trackerRef.current = null
      }
    }
    mountedRef.current = true
    gcRef.current.close()
    return () => {
      mountedRef.current = false
      immediate(dispose)
    }
  }, [])
  return trackerRef.current.track(view)
}
