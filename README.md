# Daniel Pham - Portfolio & Lambda Demo

A Next.js portfolio website hosted on Vercel with secure AWS Lambda invocation capability. Built with the same design system as the original Vite+React portfolio.

## Features

- 🎨 **Design System**: Dark theme with ink/paper/brass colors, grain texture, Fraunces + Outfit fonts
- 🔐 **Secure Lambda Invocation**: Server-side AWS SDK v3 with SigV4 signing - credentials never exposed to client
- ⚡ **Next.js 14 App Router**: Modern React with TypeScript and Tailwind CSS
- 🚀 **Vercel Ready**: Optimized for Vercel deployment with serverless functions

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your AWS credentials and Lambda function name:

```env
AWS_REGION=us-east-1
LAMBDA_FUNCTION_NAME=your-lambda-function-name
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the portfolio.

### 4. Test Lambda Integration

Navigate to the "Lambda Demo" section and click "Invoke Lambda" to test the secure Lambda invocation.

## Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Import to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure Environment Variables in Vercel:
   - `AWS_REGION`
   - `LAMBDA_FUNCTION_NAME`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

### 3. Deploy

Vercel will automatically detect Next.js and deploy. The API route at `/api/lambda/invoke` will be available as a serverless function.

## Security Notes

- **Credentials never leave the server**: AWS credentials are only used in the Vercel serverless function (`/api/lambda/invoke`)
- **SigV4 Signing**: AWS SDK v3 automatically signs requests with SigV4
- **IAM Permissions**: The AWS credentials need `lambda:InvokeFunction` permission on the target Lambda
- **No API Gateway Required**: Direct Lambda invocation via AWS SDK

### Required IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:REGION:ACCOUNT_ID:function:FUNCTION_NAME"
    }
  ]
}
```

## Project Structure

```
src/
├── app/
│   ├── api/lambda/invoke/route.ts  # Secure Lambda invocation endpoint
│   ├── globals.css                  # Global styles with design system
│   ├── layout.tsx                   # Root layout with grain texture
│   └── page.tsx                     # Main page composing all sections
├── components/
│   ├── CompanyLogo.tsx              # Company logo components
│   ├── Experience.tsx               # Experience timeline
│   ├── Footer.tsx                   # Site footer
│   ├── Hero.tsx                     # Hero section
│   ├── LambdaDemo.tsx               # Lambda invocation demo UI
│   └── Skills.tsx                   # Interactive skills grid
└── lib/
    └── data.ts                      # Portfolio data (experience, skills, links)
```

## Design System

Colors (CSS custom properties):
- `--color-ink`: #10140f (background)
- `--color-ink-soft`: #1a2118 (cards)
- `--color-paper`: #efe7d6 (primary text)
- `--color-muted`: #b7b09f (secondary text)
- `--color-brass`: #c9a227 (accent)
- `--color-brass-hot`: #e4c15a (accent hover)
- `--color-line`: #2c3528 (borders)

Fonts:
- Display: Fraunces (Google Fonts)
- Outfit (Google Fonts)

## License

MIT
