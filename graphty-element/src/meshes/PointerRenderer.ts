export type PointerDirection = "top" | "bottom" | "left" | "right" | "auto";

export interface PointerOptions {
    width: number;
    height: number;
    offset: number;
    direction: PointerDirection;
    curved: boolean;
}

export interface ContentArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Renders speech bubble pointers for label callouts
 */
export class PointerRenderer {
    /**
     * Creates a speech bubble path with pointer in clockwise direction
     * @param ctx - Canvas rendering context
     * @param contentArea - Content area dimensions
     * @param radius - Corner radius
     * @param pointerOptions - Pointer configuration options
     */
    createSpeechBubblePath(
        ctx: CanvasRenderingContext2D,
        contentArea: ContentArea,
        radius: number,
        pointerOptions: PointerOptions,
    ): void {
        switch (pointerOptions.direction) {
            case "top":
                this.createTopPointer(ctx, contentArea, radius, pointerOptions);
                break;
            case "left":
                this.createLeftPointer(ctx, contentArea, radius, pointerOptions);
                break;
            case "right":
                this.createRightPointer(ctx, contentArea, radius, pointerOptions);
                break;
            default: // "bottom"
                this.createBottomPointer(ctx, contentArea, radius, pointerOptions);
        }
    }

    /**
     * Creates a speech bubble path with pointer in counter-clockwise direction
     * @param ctx - Canvas rendering context
     * @param contentArea - Content area dimensions
     * @param radius - Corner radius
     * @param pointerOptions - Pointer configuration options
     */
    createSpeechBubblePathCCW(
        ctx: CanvasRenderingContext2D,
        contentArea: ContentArea,
        radius: number,
        pointerOptions: PointerOptions,
    ): void {
        switch (pointerOptions.direction) {
            case "top":
                this.createTopPointerCCW(ctx, contentArea, radius, pointerOptions);
                break;
            case "left":
                this.createLeftPointerCCW(ctx, contentArea, radius, pointerOptions);
                break;
            case "right":
                this.createRightPointerCCW(ctx, contentArea, radius, pointerOptions);
                break;
            default: // "bottom"
                this.createBottomPointerCCW(ctx, contentArea, radius, pointerOptions);
        }
    }

    private createBottomPointer(
        ctx: CanvasRenderingContext2D,
        area: ContentArea,
        radius: number,
        pointer: PointerOptions,
    ): void {
        const { x: contentX, y: contentY } = area;
        ctx.moveTo(contentX + radius, contentY);
        this.drawBottomPointerFromTopEdge(ctx, area, radius, pointer);
        ctx.lineTo(contentX, contentY + radius);
        ctx.quadraticCurveTo(contentX, contentY, contentX + radius, contentY);
    }

    private createTopPointer(
        ctx: CanvasRenderingContext2D,
        area: ContentArea,
        radius: number,
        pointer: PointerOptions,
    ): void {
        const { x: contentX, y: contentY, width: contentWidth, height: contentHeight } = area;
        const { width: pointerWidth, height: pointerHeight, offset: pointerOffset, curved } = pointer;
        const centerXTop = contentX + contentWidth / 2 + pointerOffset;
        ctx.moveTo(Math.max(centerXTop - pointerWidth / 2, contentX + radius), contentY);
        if (curved) {
            ctx.quadraticCurveTo(
                centerXTop,
                contentY - pointerHeight,
                Math.min(centerXTop + pointerWidth / 2, contentX + contentWidth - radius),
                contentY,
            );
        } else {
            ctx.lineTo(centerXTop, contentY - pointerHeight);
            ctx.lineTo(Math.min(centerXTop + pointerWidth / 2, contentX + contentWidth - radius), contentY);
        }

        ctx.lineTo(contentX + contentWidth - radius, contentY);
        ctx.quadraticCurveTo(contentX + contentWidth, contentY, contentX + contentWidth, contentY + radius);
        ctx.lineTo(contentX + contentWidth, contentY + contentHeight - radius);
        ctx.quadraticCurveTo(
            contentX + contentWidth,
            contentY + contentHeight,
            contentX + contentWidth - radius,
            contentY + contentHeight,
        );
        ctx.lineTo(contentX + radius, contentY + contentHeight);
        ctx.quadraticCurveTo(contentX, contentY + contentHeight, contentX, contentY + contentHeight - radius);
        ctx.lineTo(contentX, contentY + radius);
        ctx.quadraticCurveTo(contentX, contentY, contentX + radius, contentY);
    }

    private createLeftPointer(
        ctx: CanvasRenderingContext2D,
        area: ContentArea,
        radius: number,
        pointer: PointerOptions,
    ): void {
        const { x: contentX, y: contentY } = area;
        ctx.moveTo(contentX + radius, contentY);
        this.createLeftPointerCCW(ctx, area, radius, pointer);
    }

    private createRightPointer(
        ctx: CanvasRenderingContext2D,
        area: ContentArea,
        radius: number,
        pointer: PointerOptions,
    ): void {
        const { x: contentX, y: contentY, width: contentWidth, height: contentHeight } = area;
        const { width: pointerWidth, height: pointerHeight, offset: pointerOffset, curved } = pointer;
        ctx.moveTo(contentX + radius, contentY);
        ctx.lineTo(contentX + contentWidth - radius, contentY);
        ctx.quadraticCurveTo(contentX + contentWidth, contentY, contentX + contentWidth, contentY + radius);

        const centerYRight = contentY + contentHeight / 2 + pointerOffset;
        ctx.lineTo(contentX + contentWidth, Math.max(centerYRight - pointerWidth / 2, contentY + radius));
        if (curved) {
            ctx.quadraticCurveTo(
                contentX + contentWidth + pointerHeight,
                centerYRight,
                contentX + contentWidth,
                Math.min(centerYRight + pointerWidth / 2, contentY + contentHeight - radius),
            );
        } else {
            ctx.lineTo(contentX + contentWidth + pointerHeight, centerYRight);
            ctx.lineTo(
                contentX + contentWidth,
                Math.min(centerYRight + pointerWidth / 2, contentY + contentHeight - radius),
            );
        }

        ctx.lineTo(contentX + contentWidth, contentY + contentHeight - radius);
        ctx.quadraticCurveTo(
            contentX + contentWidth,
            contentY + contentHeight,
            contentX + contentWidth - radius,
            contentY + contentHeight,
        );
        ctx.lineTo(contentX + radius, contentY + contentHeight);
        ctx.quadraticCurveTo(contentX, contentY + contentHeight, contentX, contentY + contentHeight - radius);
        ctx.lineTo(contentX, contentY + radius);
        ctx.quadraticCurveTo(contentX, contentY, contentX + radius, contentY);
    }

    private createBottomPointerCCW(
        ctx: CanvasRenderingContext2D,
        area: ContentArea,
        radius: number,
        pointer: PointerOptions,
    ): void {
        const { x: contentX, y: contentY } = area;
        ctx.lineTo(contentX, contentY + radius);
        ctx.quadraticCurveTo(contentX, contentY, contentX + radius, contentY);
        this.drawBottomPointerFromTopEdge(ctx, area, radius, pointer);
    }

    // The shared middle of both bottom pointers: from the top edge, round the right side, the
    // pointer on the bottom edge and the bottom-left corner.
    private drawBottomPointerFromTopEdge(
        ctx: CanvasRenderingContext2D,
        area: ContentArea,
        radius: number,
        pointer: PointerOptions,
    ): void {
        const { x: contentX, y: contentY, width: contentWidth, height: contentHeight } = area;
        const { width: pointerWidth, height: pointerHeight, offset: pointerOffset, curved } = pointer;
        ctx.lineTo(contentX + contentWidth - radius, contentY);
        ctx.quadraticCurveTo(contentX + contentWidth, contentY, contentX + contentWidth, contentY + radius);
        ctx.lineTo(contentX + contentWidth, contentY + contentHeight - radius);
        ctx.quadraticCurveTo(
            contentX + contentWidth,
            contentY + contentHeight,
            contentX + contentWidth - radius,
            contentY + contentHeight,
        );

        const centerXBottom = contentX + contentWidth / 2 + pointerOffset;
        ctx.lineTo(
            Math.min(centerXBottom + pointerWidth / 2, contentX + contentWidth - radius),
            contentY + contentHeight,
        );
        if (curved) {
            ctx.quadraticCurveTo(
                centerXBottom,
                contentY + contentHeight + pointerHeight,
                Math.max(centerXBottom - pointerWidth / 2, contentX + radius),
                contentY + contentHeight,
            );
        } else {
            ctx.lineTo(centerXBottom, contentY + contentHeight + pointerHeight);
            ctx.lineTo(Math.max(centerXBottom - pointerWidth / 2, contentX + radius), contentY + contentHeight);
        }

        ctx.lineTo(contentX + radius, contentY + contentHeight);
        ctx.quadraticCurveTo(contentX, contentY + contentHeight, contentX, contentY + contentHeight - radius);
    }

    private createTopPointerCCW(
        ctx: CanvasRenderingContext2D,
        area: ContentArea,
        radius: number,
        pointer: PointerOptions,
    ): void {
        const { x: contentX, y: contentY, width: contentWidth, height: contentHeight } = area;
        const { width: pointerWidth, height: pointerHeight, offset: pointerOffset, curved } = pointer;
        ctx.lineTo(contentX, contentY + contentHeight - radius);
        ctx.quadraticCurveTo(contentX, contentY + contentHeight, contentX + radius, contentY + contentHeight);
        ctx.lineTo(contentX + contentWidth - radius, contentY + contentHeight);
        ctx.quadraticCurveTo(
            contentX + contentWidth,
            contentY + contentHeight,
            contentX + contentWidth,
            contentY + contentHeight - radius,
        );
        ctx.lineTo(contentX + contentWidth, contentY + radius);
        ctx.quadraticCurveTo(contentX + contentWidth, contentY, contentX + contentWidth - radius, contentY);

        const centerXTop = contentX + contentWidth / 2 + pointerOffset;
        ctx.lineTo(Math.min(centerXTop + pointerWidth / 2, contentX + contentWidth - radius), contentY);
        if (curved) {
            ctx.quadraticCurveTo(
                centerXTop,
                contentY - pointerHeight,
                Math.max(centerXTop - pointerWidth / 2, contentX + radius),
                contentY,
            );
        } else {
            ctx.lineTo(centerXTop, contentY - pointerHeight);
            ctx.lineTo(Math.max(centerXTop - pointerWidth / 2, contentX + radius), contentY);
        }

        ctx.lineTo(contentX + radius, contentY);
        ctx.quadraticCurveTo(contentX, contentY, contentX, contentY + radius);
    }

    private createLeftPointerCCW(
        ctx: CanvasRenderingContext2D,
        area: ContentArea,
        radius: number,
        pointer: PointerOptions,
    ): void {
        const { x: contentX, y: contentY, width: contentWidth, height: contentHeight } = area;
        const { width: pointerWidth, height: pointerHeight, offset: pointerOffset, curved } = pointer;
        ctx.lineTo(contentX + contentWidth - radius, contentY);
        ctx.quadraticCurveTo(contentX + contentWidth, contentY, contentX + contentWidth, contentY + radius);
        ctx.lineTo(contentX + contentWidth, contentY + contentHeight - radius);
        ctx.quadraticCurveTo(
            contentX + contentWidth,
            contentY + contentHeight,
            contentX + contentWidth - radius,
            contentY + contentHeight,
        );
        ctx.lineTo(contentX + radius, contentY + contentHeight);
        ctx.quadraticCurveTo(contentX, contentY + contentHeight, contentX, contentY + contentHeight - radius);

        const centerYLeft = contentY + contentHeight / 2 + pointerOffset;
        ctx.lineTo(contentX, Math.min(centerYLeft + pointerWidth / 2, contentY + contentHeight - radius));
        if (curved) {
            ctx.quadraticCurveTo(
                contentX - pointerHeight,
                centerYLeft,
                contentX,
                Math.max(centerYLeft - pointerWidth / 2, contentY + radius),
            );
        } else {
            ctx.lineTo(contentX - pointerHeight, centerYLeft);
            ctx.lineTo(contentX, Math.max(centerYLeft - pointerWidth / 2, contentY + radius));
        }

        ctx.lineTo(contentX, contentY + radius);
        ctx.quadraticCurveTo(contentX, contentY, contentX + radius, contentY);
    }

    private createRightPointerCCW(
        ctx: CanvasRenderingContext2D,
        area: ContentArea,
        radius: number,
        pointer: PointerOptions,
    ): void {
        const { x: contentX, y: contentY, width: contentWidth, height: contentHeight } = area;
        const { width: pointerWidth, height: pointerHeight, offset: pointerOffset, curved } = pointer;
        ctx.lineTo(contentX + radius, contentY);
        ctx.quadraticCurveTo(contentX, contentY, contentX, contentY + radius);
        ctx.lineTo(contentX, contentY + contentHeight - radius);
        ctx.quadraticCurveTo(contentX, contentY + contentHeight, contentX + radius, contentY + contentHeight);
        ctx.lineTo(contentX + contentWidth - radius, contentY + contentHeight);
        ctx.quadraticCurveTo(
            contentX + contentWidth,
            contentY + contentHeight,
            contentX + contentWidth,
            contentY + contentHeight - radius,
        );

        const centerYRight = contentY + contentHeight / 2 + pointerOffset;
        ctx.lineTo(
            contentX + contentWidth,
            Math.min(centerYRight + pointerWidth / 2, contentY + contentHeight - radius),
        );
        if (curved) {
            ctx.quadraticCurveTo(
                contentX + contentWidth + pointerHeight,
                centerYRight,
                contentX + contentWidth,
                Math.max(centerYRight - pointerWidth / 2, contentY + radius),
            );
        } else {
            ctx.lineTo(contentX + contentWidth + pointerHeight, centerYRight);
            ctx.lineTo(contentX + contentWidth, Math.max(centerYRight - pointerWidth / 2, contentY + radius));
        }

        ctx.lineTo(contentX + contentWidth, contentY + radius);
        ctx.quadraticCurveTo(contentX + contentWidth, contentY, contentX + contentWidth - radius, contentY);
    }
}
