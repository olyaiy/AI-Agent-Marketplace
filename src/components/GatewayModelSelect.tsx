import { fetchGatewayLanguageModels } from "@/lib/gateway-models";
import { ModelSelect } from "./ModelSelect";

interface Props {
  value?: string;
  onChange?: (modelId: string) => void;
  showLogos?: boolean;
}

export async function GatewayModelSelect({ value, onChange, showLogos }: Props) {
  const models = await fetchGatewayLanguageModels();
  return <ModelSelect models={models} value={value} onChange={onChange} showLogos={showLogos ?? true} />;
}


