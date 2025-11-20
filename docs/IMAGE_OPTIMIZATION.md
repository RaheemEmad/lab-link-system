// Image Optimization Guide for LabLink

## Usage Examples

### 1. LazyImage Component
Use for standard images that need lazy loading:

```tsx
import { LazyImage } from "@/components/ui/lazy-image";

<LazyImage
  src="/path/to/image.jpg"
  alt="Description"
  className="w-full h-auto rounded-lg"
/>
```

### 2. LazyBackground Component
Use for background images in sections:

```tsx
import { LazyBackground } from "@/components/ui/lazy-image";

<LazyBackground 
  src="/path/to/hero-bg.jpg"
  className="min-h-screen flex items-center"
>
  <div>Your content here</div>
</LazyBackground>
```

### 3. Optimizing Existing Images

**Before:**
```tsx
<img src="/large-image.jpg" alt="Hero" />
```

**After:**
```tsx
<LazyImage 
  src="/large-image.jpg" 
  alt="Hero"
  className="w-full"
/>
```

## Best Practices

1. **Use appropriate image formats:**
   - WebP for photos (best compression)
   - SVG for logos and icons
   - PNG for images requiring transparency

2. **Responsive images:**
```tsx
<LazyImage
  src="/hero-desktop.jpg"
  alt="Hero"
  className="hidden md:block"
/>
<LazyImage
  src="/hero-mobile.jpg"
  alt="Hero"
  className="block md:hidden"
/>
```

3. **Set explicit dimensions to prevent layout shift:**
```tsx
<LazyImage
  src="/image.jpg"
  alt="Product"
  width={800}
  height={600}
  className="w-full h-auto"
/>
```

4. **Use placeholder images:**
The LazyImage component automatically uses a gray placeholder while loading.
You can customize the fallback:

```tsx
<LazyImage
  src="/image.jpg"
  alt="Product"
  fallback="/path/to/low-res-placeholder.jpg"
/>
```

## Performance Benefits

- **Lazy Loading**: Images only load when they're about to enter the viewport
- **Bandwidth Saving**: Reduces initial page load by ~40-60%
- **Improved First Contentful Paint (FCP)**: Faster perceived performance
- **Smooth Transitions**: Blur-to-clear effect for better UX
- **Error Handling**: Automatic fallback on image load failure

## Where to Apply

✅ **High Priority:**
- Hero images
- Product/service images
- Gallery/portfolio images
- User-uploaded content
- Background images in sections

✅ **Low Priority:**
- Small icons (< 10KB)
- SVG logos
- Above-the-fold critical images (consider preloading instead)

## Image Size Guidelines

- Hero images: Max 1920px width, optimized to < 200KB
- Thumbnails: Max 400px width, optimized to < 50KB
- Icons: Use SVG when possible
- Photos: Use WebP format with fallback to JPEG

## Tools for Image Optimization

1. **Online Tools:**
   - TinyPNG (PNG/JPEG compression)
   - Squoosh (WebP conversion)
   - SVGOMG (SVG optimization)

2. **Command Line:**
   ```bash
   # Convert to WebP
   cwebp input.jpg -q 80 -o output.webp
   
   # Optimize PNG
   pngquant input.png --output output.png
   ```

## Implementation Checklist

- [ ] Replace all `<img>` tags with `<LazyImage>`
- [ ] Convert large JPEGs to WebP format
- [ ] Add width/height attributes to prevent layout shift
- [ ] Test on slow 3G connection
- [ ] Verify images load correctly on mobile
- [ ] Check accessibility (proper alt text)
- [ ] Measure performance improvement with Lighthouse
