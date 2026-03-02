export function AxonometricCity({ className }: { className?: string }) {
  // Axonometric projection constants
  // Each "block" is drawn as a hexagon-ish shape: top face + two side faces
  // Grid uses isometric math: x' = x - y, y' = (x + y) * 0.5

  const ISO_X = 1
  const ISO_Y = 0.5

  function isoPoint(gx: number, gy: number, gz: number = 0) {
    const sx = (gx - gy) * ISO_X * 40
    const sy = (gx + gy) * ISO_Y * 40 - gz * 28
    return { x: sx, y: sy }
  }

  function buildingPath(
    gx: number,
    gy: number,
    h: number
  ): { top: string; left: string; right: string } {
    const corners = [
      isoPoint(gx, gy, h),
      isoPoint(gx + 1, gy, h),
      isoPoint(gx + 1, gy + 1, h),
      isoPoint(gx, gy + 1, h),
      isoPoint(gx, gy, 0),
      isoPoint(gx + 1, gy, 0),
      isoPoint(gx + 1, gy + 1, 0),
      isoPoint(gx, gy + 1, 0),
    ]

    const top = `M ${corners[0].x},${corners[0].y} L ${corners[1].x},${corners[1].y} L ${corners[2].x},${corners[2].y} L ${corners[3].x},${corners[3].y} Z`
    const left = `M ${corners[3].x},${corners[3].y} L ${corners[2].x},${corners[2].y} L ${corners[6].x},${corners[6].y} L ${corners[7].x},${corners[7].y} Z`
    const right = `M ${corners[1].x},${corners[1].y} L ${corners[2].x},${corners[2].y} L ${corners[6].x},${corners[6].y} L ${corners[5].x},${corners[5].y} Z`

    return { top, left, right }
  }

  // Building definitions: [gridX, gridY, height, isAccent]
  const buildings: [number, number, number, boolean][] = [
    [0, 0, 2, false],
    [1, 0, 3, false],
    [2, 0, 1, false],
    [3, 0, 4, false],
    [4, 0, 2, false],
    [0, 1, 1, false],
    [1, 1, 5, false],
    [2, 1, 2, true],   // accent building
    [3, 1, 3, false],
    [4, 1, 1, false],
    [0, 2, 3, false],
    [1, 2, 2, false],
    [2, 2, 4, false],
    [3, 2, 1, false],
    [4, 2, 3, false],
    [0, 3, 1, false],
    [1, 3, 3, false],
    [2, 3, 2, false],
    [3, 3, 5, false],
    [4, 3, 1, false],
    [0, 4, 2, false],
    [1, 4, 1, false],
    [2, 4, 3, false],
    [3, 4, 2, false],
    [4, 4, 4, false],
  ]

  // Colours — very muted so they don't distract
  const neutral = {
    top: '#E8EBE7',
    left: '#D4D9D2',
    right: '#CBCFC9',
  }
  const accentColor = {
    top: '#7BAE96',
    left: '#5F8D76',
    right: '#527A66',
  }

  // Offset so the grid centres nicely in the SVG viewport
  const offsetX = 320
  const offsetY = 80

  return (
    <svg
      viewBox="0 0 640 480"
      className={className}
      aria-hidden="true"
      role="img"
      style={{ overflow: 'visible' }}
    >
      <title>Axonometric city illustration</title>
      <g transform={`translate(${offsetX}, ${offsetY})`}>
        {/* Roads / ground grid */}
        {[0, 1, 2, 3, 4, 5].map((gx) =>
          [0, 1, 2, 3, 4, 5].map((gy) => {
            const corners = [
              isoPoint(gx, gy),
              isoPoint(gx + 1, gy),
              isoPoint(gx + 1, gy + 1),
              isoPoint(gx, gy + 1),
            ]
            return (
              <polygon
                key={`ground-${gx}-${gy}`}
                points={corners.map((c) => `${c.x},${c.y}`).join(' ')}
                fill="#F0F2EF"
                stroke="#E3E6E2"
                strokeWidth="0.5"
              />
            )
          })
        )}

        {/* Buildings — sorted back-to-front for painter's algorithm */}
        {[...buildings]
          .sort((a, b) => a[0] + a[1] - (b[0] + b[1]))
          .map(([gx, gy, h, isAccent]) => {
            const c = isAccent ? accentColor : neutral
            const paths = buildingPath(gx, gy, h)
            const key = `b-${gx}-${gy}`
            return (
              <g key={key}>
                <path d={paths.left} fill={c.left} />
                <path d={paths.right} fill={c.right} />
                <path d={paths.top} fill={c.top} />
                {/* Window grid on front face for accent building */}
                {isAccent && h >= 3 && (
                  <>
                    {[1, 2, 3].map((row) =>
                      [0].map((col) => {
                        const wx = isoPoint(gx + 0.25 + col * 0.4, gy + 1, row * 0.55 + 0.3)
                        return (
                          <rect
                            key={`w-${row}-${col}`}
                            x={wx.x - 4}
                            y={wx.y - 3}
                            width={5}
                            height={4}
                            fill="rgba(255,255,255,0.55)"
                            transform={`skewX(-30) skewY(10)`}
                            style={{ transformOrigin: `${wx.x}px ${wx.y}px` }}
                          />
                        )
                      })
                    )}
                  </>
                )}
              </g>
            )
          })}

        {/* Location pin on accent building */}
        {(() => {
          const [gx, gy, h] = buildings.find((b) => b[3])!
          const tip = isoPoint(gx + 0.5, gy + 0.5, h + 0.5)
          return (
            <g transform={`translate(${tip.x}, ${tip.y - 6})`}>
              <circle cx={0} cy={0} r={5} fill="#5F8D76" opacity={0.9} />
              <circle cx={0} cy={0} r={2.5} fill="white" />
            </g>
          )
        })()}
      </g>
    </svg>
  )
}
