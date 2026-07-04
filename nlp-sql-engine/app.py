import streamlit as st
import torch
import unsloth
from peft import PeftModel, PeftConfig
from transformers import AutoTokenizer
from unsloth import FastLanguageModel

st.set_page_config(page_title="QueryWright: Text-to-SQL", layout="centered")
st.title("💬 QueryWright — Natural Language to SQL using LoRA + Mistral 7B")

# ⏬ Load model + LoRA adapter
@st.cache_resource
def load_model():
    adapter_path = "./fine-tuned-mistral"  # Your saved LoRA folder
    config = PeftConfig.from_pretrained(adapter_path)

    base_model, tokenizer = FastLanguageModel.from_pretrained(
        model_name = config.base_model_name_or_path,  # This is auto-read from LoRA config
        max_seq_length = 2048,
        dtype = torch.float16,
        load_in_4bit = True,
        device_map = "auto"
    )

    # Load LoRA adapter on top of base
    model = PeftModel.from_pretrained(base_model, adapter_path)
    model.eval()
    FastLanguageModel.for_inference(model)
    return model, tokenizer

model, tokenizer = load_model()

# 🧠 Inputs
st.markdown("Enter your question and the relevant database schema below:")

schema = st.text_area("🧾 Schema (e.g., students(student_id, name, cgpa))", height=100)
question = st.text_input("💡 Question", placeholder="List students with CGPA above 9")

# 🧪 Predict
if st.button("Generate SQL"):
    if not schema or not question:
        st.warning("Please enter both the schema and question.")
    else:
        with st.spinner("Generating SQL..."):
            prompt = f"### Instruction:\nGiven the schema: {schema}\nTranslate the following question into SQL:\n{question}\n\n### Response:\n"
            inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
            outputs = model.generate(**inputs, max_new_tokens=128, do_sample=False)
            response = tokenizer.decode(outputs[0], skip_special_tokens=True)
            sql_output = response.split("### Response:")[-1].strip()

        st.subheader("🧾 Generated SQL")
        st.code(sql_output, language="sql")
