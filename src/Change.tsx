
const CHANGE_SYMBOLS = {
    0: " ", 
    1: "▲",
    "-1": "▼",
  }
  
  const CHANGE_CLASS = {
    0: "noChange",
    1: "positive",
    "-1": "negative",
  }
  
  type ChangeProps = {
    weight?: number,
    unit: string,
    since?: number,
    sinceLabel: string,
  }
  
  export function Change({ weight = 0, unit, since = Date.now(), sinceLabel }: ChangeProps) {
  
    const sinceDate = new Date(since).toLocaleString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const sinceDays = Math.floor((Date.now() - since) / 1000 / 60 / 60 / 24);
    const changeDirection = weight === 0 ? 0 : weight > 0 ? 1 : -1;
    // format weight: absolute value, 2 decimal places
    const value = Math.abs(weight).toFixed(2);
  
    return (
      <div className="Change">
        <p className={`Change__amount Change__amount--${CHANGE_CLASS[changeDirection]}`}>
          <span className="Change__symbol">{CHANGE_SYMBOLS[changeDirection]}</span>
          <span className="Change__value">{value}</span>
          <span className="Change__unit">{unit}</span>  
        </p>
        <p className="Change__since Change__since--label">since {sinceLabel}</p>
        <p className="Change__since Change__since--date">({sinceDate}, {sinceDays} day{sinceDays === 1 ? "": "s"} ago)</p>
      </div>
    )
  }
  