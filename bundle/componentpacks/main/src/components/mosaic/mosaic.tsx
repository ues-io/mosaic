import { styles, definition, api, signal } from "@uesio/ui"
import { useEffect } from "react"

type ComponentDefinition = {
	text?: string
	fontSize?: number
	backgroundColor?: string
	gridHeight?: number
	gridWidth?: number
	font?: string
	color?: string
	heightOffset?: number

	colorwire?: string
	colornamefield?: string
	coloridfield?: string
	colorvaluefield?: string

	tilewire?: string
	tilecoloridfield?: string
	tilecolornamefield?: string
	tilecolorvaluefield?: string
	tilequantityfield?: string
}

type Color = {
	r: number
	g: number
	b: number
	name?: string
	blid?: string
}

type ColorData = {
	count: number
	color: Color
}

type GridState = {
	text?: string
	fontSize?: number
	backgroundColor?: string
	gridHeight?: number
	gridWidth?: number
	font?: string
	color?: string
	heightOffset?: number
}

const setText: signal.ComponentSignalDescriptor<GridState> = {
	dispatcher: (state, signal) => {
		state.text = signal.text
	},
}

const setFontSize: signal.ComponentSignalDescriptor<GridState> = {
	dispatcher: (state, signal) => {
		state.fontSize = signal.fontSize
	},
}

const setBackgroundColor: signal.ComponentSignalDescriptor<GridState> = {
	dispatcher: (state, signal) => {
		state.backgroundColor = signal.backgroundColor
	},
}

const setGridHeight: signal.ComponentSignalDescriptor<GridState> = {
	dispatcher: (state, signal) => {
		state.size = signal.size
	},
}

const setGridWidth: signal.ComponentSignalDescriptor<GridState> = {
	dispatcher: (state, signal) => {
		state.size = signal.size
	},
}

const setFont: signal.ComponentSignalDescriptor<GridState> = {
	dispatcher: (state, signal) => {
		state.font = signal.font
	},
}

const setColor: signal.ComponentSignalDescriptor<GridState> = {
	dispatcher: (state, signal) => {
		state.color = signal.color
	},
}

const signals: Record<string, signal.ComponentSignalDescriptor> = {
	SET_TEXT: setText,
	SET_FONT_SIZE: setFontSize,
	SET_BACKGROUND_COLOR: setBackgroundColor,
	SET_GRID_HEIGHT: setGridHeight,
	SET_GRID_WIDTH: setGridWidth,
	SET_FONT: setFont,
	SET_COLOR: setColor,
}

const rgbToHex = (color: Color) =>
	"" +
	((1 << 24) | (color.r << 16) | (color.g << 8) | color.b)
		.toString(16)
		.slice(1)

const hexToRgb = (hex: string) => {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
		  }
		: null
}

const distance = (a: Color, b: Color) =>
	Math.sqrt(
		Math.pow(a.r - b.r, 2) + Math.pow(a.g - b.g, 2) + Math.pow(a.b - b.b, 2)
	)

const nearestColor = (colors: Color[], color: Color) => {
	if (!colors) return color
	let lowest = Number.POSITIVE_INFINITY
	let tmp
	let index = 0
	colors.forEach((el, i) => {
		tmp = distance(color, el)
		if (tmp < lowest) {
			lowest = tmp
			index = i
		}
	})
	return colors[index]
}

const Component: definition.UC<ComponentDefinition> = (props) => {
	const { definition, context } = props
	const {
		colorwire,
		coloridfield,
		colornamefield,
		colorvaluefield,
		tilewire,
		tilecoloridfield,
		tilecolornamefield,
		tilecolorvaluefield,
		tilequantityfield,
	} = definition

	const componentId = api.component.getComponentIdFromProps(props)
	const [state] = api.component.useState(componentId, {})

	const colorsWire = api.wire.useWire(colorwire, context)

	const hasAllColorFields = colorvaluefield && coloridfield && colornamefield

	const colors =
		hasAllColorFields &&
		colorsWire?.getData().flatMap((color) => {
			const rgb: Color | null = hexToRgb(
				color.getFieldValue(colorvaluefield)
			)
			if (!rgb || !rgb.r || !rgb.g || !rgb.b) return []
			rgb.blid = color.getFieldValue(coloridfield)
			rgb.name = color.getFieldValue(colornamefield)
			return [rgb]
		})

	const gridHeight = state.gridHeight || definition.gridHeight || 48
	const gridWidth = state.gridWidth || definition.gridWidth || 48
	const fontSize = state.fontSize || definition.fontSize || 32
	const backgroundColor =
		state.backgroundColor || definition.backgroundColor || "white"
	const font = state.font || definition.font || "serif"
	const text = state.text || definition.text || ""
	const color = state.color || definition.color || "black"
	const heightOffset = state.heightOffset || definition.heightOffset || 0

	const classes = styles.useStyleTokens(
		{
			root: [
				"grid",
				`grid-cols-[repeat(${gridWidth},1fr)]`,
				`grid-rows-[repeat(${gridHeight},1fr)]`,
			],
			cell: ["aspect-square"],
		},
		props
	)

	const canvas = document.createElement("canvas")
	const ctx = canvas.getContext("2d")
	const colorMap: Record<string, ColorData> = {}

	useEffect(() => {
		if (
			tilewire &&
			tilecoloridfield &&
			tilecolornamefield &&
			tilecolorvaluefield &&
			tilequantityfield
		) {
			const resultWire = context.getWire(tilewire)
			resultWire.reset()
			resultWire.createRecords({
				context,
				records: Object.keys(colorMap).map((colorkey) => {
					const colorData = colorMap[colorkey]
					return {
						[tilecoloridfield]: colorData.color.blid,
						[tilecolornamefield]: colorData.color.name,
						[tilecolorvaluefield]: rgbToHex(colorData.color),
						[tilequantityfield]: colorData.count,
					}
				}),
			})
		}
	})
	if (!ctx) return
	ctx.fillStyle = backgroundColor
	ctx.fillRect(0, 0, canvas.width, canvas.height)
	ctx.textAlign = "center"
	ctx.textBaseline = "middle"
	ctx.fillStyle = color
	ctx.font = `bold ${fontSize}px ${font}`
	ctx.fillText(text, gridWidth / 2, gridHeight / 2 + heightOffset)
	const imageData = ctx.getImageData(0, 0, gridWidth, gridHeight)

	return (
		<div className={classes.root}>
			{[...Array(imageData.height)].map((value, rowIndex) =>
				[...Array(imageData.width)].map((value, colIndex) => {
					const index = (rowIndex * imageData.width + colIndex) * 4
					const r = imageData.data[index]
					const g = imageData.data[index + 1]
					const b = imageData.data[index + 2]

					const l = nearestColor(colors, { r, g, b }) || {
						r: 255,
						g: 255,
						b: 255,
					}

					if (l.blid) {
						const colorData = colorMap[l.blid]
						if (colorData) {
							colorData.count = colorData.count + 1
						} else {
							colorMap[l.blid] = {
								count: 1,
								color: l,
							}
						}
					}

					return (
						<div
							className={classes.cell}
							style={{
								backgroundColor: `rgb(${l.r},${l.g},${l.b})`,
							}}
							key={`${rowIndex}_${colIndex}`}
						/>
					)
				})
			)}
		</div>
	)
}

Component.signals = signals

export default Component
