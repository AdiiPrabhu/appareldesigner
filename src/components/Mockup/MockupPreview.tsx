import React, { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Stage, Layer, Image as KonvaImage, Transformer, Rect, Line } from 'react-konva'
import Konva from 'konva'
import { imagesApi, exportApi, getImageUrl } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import MockupControls from './MockupControls'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import { Shirt } from 'lucide-react'
import type { MockupPlacement, ProductType } from '@/types'

const CANVAS_WIDTH = 600
const CANVAS_HEIGHT = 700

const DEFAULT_PLACEMENT: MockupPlacement = {
  x: 150,
  y: 180,
  scale: 0.4,
  rotation: 0,
  garment_color: '#ffffff',
  garment_type: 'tshirt',
  placement_zone: 'front',
}

// Simple garment outline paths for different types
const GARMENT_COLORS: Record<string, string> = {
  '#ffffff': 'White',
  '#000000': 'Black',
  '#1a1a2e': 'Navy',
  '#4a4a4a': 'Charcoal',
  '#ff0000': 'Red',
  '#0000ff': 'Blue',
  '#008000': 'Green',
}

const MockupPreview: React.FC = () => {
  const { imageId } = useParams()
  const { mockupImageId, addNotification } = useAppStore()
  const targetImageId = imageId || mockupImageId

  const stageRef = useRef<Konva.Stage>(null)
  const designRef = useRef<Konva.Image>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

  const [placement, setPlacement] = useState<MockupPlacement>(DEFAULT_PLACEMENT)
  const [history, setHistory] = useState<MockupPlacement[]>([DEFAULT_PLACEMENT])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [designImage, setDesignImage] = useState<HTMLImageElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const { data: imageData, isLoading } = useQuery({
    queryKey: ['image-detail', targetImageId],
    queryFn: () => imagesApi.get(targetImageId!),
    enabled: !!targetImageId,
  })

  // Load design image
  useEffect(() => {
    if (imageData?.file_path) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = getImageUrl(imageData.file_path)
      img.onload = () => setDesignImage(img)
    }
  }, [imageData])

  // Attach transformer to design
  useEffect(() => {
    if (designRef.current && transformerRef.current) {
      transformerRef.current.nodes([designRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [designImage])

  const pushHistory = (newPlacement: MockupPlacement) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newPlacement)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setPlacement(history[historyIndex - 1])
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setPlacement(history[historyIndex + 1])
    }
  }

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const newPlacement = { ...placement, x: e.target.x(), y: e.target.y() }
    setPlacement(newPlacement)
    pushHistory(newPlacement)
    setIsDragging(false)
  }

  const handleTransformEnd = (e: Konva.KonvaEventObject<Event>) => {
    const node = e.target
    const scaleX = node.scaleX()
    const newPlacement = {
      ...placement,
      x: node.x(),
      y: node.y(),
      scale: scaleX,
      rotation: node.rotation(),
    }
    node.scaleX(1)
    node.scaleY(1)
    setPlacement(newPlacement)
    pushHistory(newPlacement)
  }

  const handleExportMockup = async () => {
    if (!stageRef.current || !targetImageId) return
    setIsExporting(true)
    try {
      const result = await exportApi.exportMockup({
        image_id: targetImageId,
        placement: placement as unknown as Record<string, unknown>,
        garment_type: placement.garment_type,
        garment_color: placement.garment_color,
      })
      addNotification({ type: 'success', title: 'Mockup Exported', message: result.export_path })
    } catch {
      addNotification({ type: 'error', title: 'Export Failed' })
    } finally {
      setIsExporting(false)
    }
  }

  const designSize = designImage
    ? {
        width: Math.min(designImage.width, 400) * placement.scale,
        height: Math.min(designImage.height, 400) * placement.scale,
      }
    : { width: 0, height: 0 }

  // Print area guide for front placement
  const printArea = { x: 130, y: 160, width: 340, height: 360 }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Canvas area */}
      <div className="flex-1 bg-surface2/50 flex flex-col items-center justify-center overflow-hidden relative">
        {!targetImageId ? (
          <EmptyState
            icon={<Shirt />}
            title="No design selected"
            description="Open a design from the Gallery and click 'Send to Mockup'"
          />
        ) : isLoading ? (
          <LoadingSpinner size="lg" />
        ) : (
          <div className="shadow-2xl rounded-xl overflow-hidden">
            <Stage width={CANVAS_WIDTH} height={CANVAS_HEIGHT} ref={stageRef}>
              <Layer>
                {/* Garment background */}
                <Rect
                  x={80}
                  y={60}
                  width={440}
                  height={580}
                  fill={placement.garment_color}
                  cornerRadius={8}
                  shadowColor="rgba(0,0,0,0.3)"
                  shadowBlur={20}
                  shadowOffsetY={5}
                />

                {/* Print area guide */}
                <Rect
                  x={printArea.x}
                  y={printArea.y}
                  width={printArea.width}
                  height={printArea.height}
                  stroke="rgba(108,99,255,0.4)"
                  strokeWidth={1}
                  dash={[6, 4]}
                  fill="transparent"
                />

                {/* Design image */}
                {designImage && (
                  <KonvaImage
                    ref={designRef}
                    image={designImage}
                    x={placement.x}
                    y={placement.y}
                    width={Math.min(designImage.width, 400)}
                    height={Math.min(designImage.height, 400)}
                    scaleX={placement.scale}
                    scaleY={placement.scale}
                    rotation={placement.rotation}
                    draggable
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={handleDragEnd}
                    onTransformEnd={handleTransformEnd}
                    onClick={() => {
                      if (transformerRef.current && designRef.current) {
                        transformerRef.current.nodes([designRef.current])
                        transformerRef.current.getLayer()?.batchDraw()
                      }
                    }}
                  />
                )}

                {/* Transformer */}
                <Transformer
                  ref={transformerRef}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 20 || newBox.height < 20) return oldBox
                    return newBox
                  }}
                  borderStroke="#6c63ff"
                  anchorStroke="#6c63ff"
                  anchorFill="#ffffff"
                />
              </Layer>
            </Stage>
          </div>
        )}

        {/* Keyboard shortcuts hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-text/20 space-x-3">
          <span>Drag to position</span>
          <span>•</span>
          <span>Handles to resize/rotate</span>
          <span>•</span>
          <span>Ctrl+Z to undo</span>
        </div>
      </div>

      {/* Controls panel */}
      <div className="w-64 border-l border-border bg-surface flex-shrink-0 overflow-y-auto">
        <MockupControls
          placement={placement}
          onPlacementChange={(update) => {
            const newPlacement = { ...placement, ...update }
            setPlacement(newPlacement)
            pushHistory(newPlacement)
          }}
          onExport={handleExportMockup}
          isExporting={isExporting}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          hasDesign={!!designImage}
        />
      </div>
    </div>
  )
}

export default MockupPreview
