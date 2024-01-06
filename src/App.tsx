import { useState, useEffect } from 'react'
import { Change } from './Change'
import classnames from 'classnames'

import { EVENT_CONNECTED, EVENT_DISCONNECTED, EVENT_WEIGHT, connectToBluetoothDevice } from './device'
import './App.scss'
import './Change.scss'

function Connection() {
  const [connection, setConnection] = useState(false)

  useEffect(()=>{
    const connectedHandler = () => {
      setConnection(true)
    }
    const disconnectedHandler = () => {
      setConnection(false)
    }
    // wait for custom connection events
    document.addEventListener(EVENT_CONNECTED, connectedHandler)
    document.addEventListener(EVENT_DISCONNECTED, disconnectedHandler)

    return () => {
      document.removeEventListener(EVENT_CONNECTED, connectedHandler)
      document.removeEventListener(EVENT_DISCONNECTED, disconnectedHandler)
    }
  }, [])

  return (
    <div>
      <button onClick={() => connectToBluetoothDevice()} disabled={connection} className={classnames("Cta", {
        "Cta--success": connection,
      })}>
        {connection ? 'Connected' : 'Connect'}
      </button>
    </div>
  )
}

type Datapoint = {
  weight: number
  unit: string
  timestamp: number
}

function getDataFromLocalStorage() {
  const data = localStorage.getItem('data')
  if (!data) {
    return []
  }
  return JSON.parse(data) as Datapoint[]
}

function addDatapointToLocalStorage(datapoint: Datapoint) {
  const data = getDataFromLocalStorage()
  data.push(datapoint)
  localStorage.setItem('data', JSON.stringify(data))
}

function handleResetData() {
  localStorage.removeItem('data')
}


const getChangeSince = (datapointBefore?: Datapoint, datapointAfter?: Datapoint): number => {
  if (!datapointBefore || !datapointAfter) {
    return 0
  }
  return datapointAfter.weight - datapointBefore.weight
}



function App() {
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [showSinceLastCheckin, setShowSinceLastCheckin] = useState(false)
  const [connectedDatapoint, setConnectedDatapoint] = useState<Datapoint | undefined>(undefined)
  const [data, setData] = useState(getDataFromLocalStorage())
  const updateData = (datapoint: Datapoint) => {
    addDatapointToLocalStorage(datapoint)
    setData(getDataFromLocalStorage())
  }

  useEffect(() => {
    const weightHandler = (event: CustomEvent) => {
      const { weight, unit } = event.detail
      const timestamp = Date.now()
      const datapoint = { weight, unit, timestamp }
      setConnectedDatapoint(datapoint)
    }
    document.addEventListener(EVENT_WEIGHT, weightHandler as EventListener)
    return () => {
      document.removeEventListener(EVENT_WEIGHT, weightHandler as EventListener)
    }
  }, [])

  const oldestDatapoint = data[0]
  const mostRecentDatapoint = data[data.length - 1]
  const datapointAfter = connectedDatapoint || mostRecentDatapoint

  const changeSinceBeginning = getChangeSince(oldestDatapoint, datapointAfter);
  const changeSinceLastCheckin = connectedDatapoint ? getChangeSince(mostRecentDatapoint, connectedDatapoint) : undefined;

  const onReset = () => {
    setIsResetModalOpen(false)
    alert("Data reset")
    handleResetData()
    setData(getDataFromLocalStorage())
  }

  return (
    <>
      <div className={classnames("App", {
        "App--modal-open": isResetModalOpen,
      })} onClick={(e) => {
        if (isResetModalOpen) {
          e.preventDefault()
          e.stopPropagation()
          setIsResetModalOpen(false)
        }
      }}>
        <Connection />
        <div className="Progress">
          {connectedDatapoint && <div className='DataReady'>New Data Received!</div>}
          <div className="Progress__item">
            <Change weight={changeSinceBeginning} unit="kg" since={oldestDatapoint?.timestamp} sinceLabel="beginning"/>
          </div>

          {showSinceLastCheckin && <div className="Progress__item">
            <Change weight={changeSinceLastCheckin} unit="kg" since={datapointAfter?.timestamp} sinceLabel="last checkin"/>
          </div>}
        </div>
        <div className="Actions">
          {connectedDatapoint && <button className="Cta" onClick={() => {
            updateData(connectedDatapoint)
            setConnectedDatapoint(undefined)
          }}>Save</button>}
          <button className="Cta Cta--danger" onClick={() => {
            setIsResetModalOpen(true)
          }}>Reset</button>
        </div>
        <div><button onClick={()=>{setShowSinceLastCheckin(!showSinceLastCheckin)}}>{showSinceLastCheckin ? "Hide" : "Show"} Last Checkin</button></div>
      </div>
      <dialog className="Dialog" open={isResetModalOpen}>
        <h2 className="Dialog__title"><p>Are you sure?</p><p>This will delete all previous data.</p> </h2>
        <div className="Dialog__actions">
          <button className="Cta" onClick={() => {
            setIsResetModalOpen(false)
          }}>Cancel</button>
          <button className="Cta Cta--danger" onClick={onReset}>Reset</button>
        </div>
      </dialog>
    </>
  )
}

export default App
