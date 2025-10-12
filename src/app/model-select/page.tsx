'use client';

import { useState } from "react";
import { OpenRouterModelSelect } from "@/components/OpenRouterModelSelect";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
    const [model, setModel] = useState("");

    return (
        <div className="size-full flex items-center justify-center p-6">
            <Card className="w-full max-w-xl">
                <CardHeader>
                    <CardTitle>Select an OpenRouter model</CardTitle>
                    <CardDescription>Search and pick a model from OpenRouter.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-3">
                        <OpenRouterModelSelect
                            value={model}
                            onChange={setModel}
                            placeholder="Search models..."
                            width="100%"
                        />
                        {model ? (
                            <div className="text-sm text-muted-foreground">
                                Selected: <code className="rounded bg-muted px-1 py-0.5">{model}</code>
                            </div>
                        ) : null}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}