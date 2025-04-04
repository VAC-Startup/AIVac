import axios from "axios";

const URL = "http://localhost:5050";


export async function createPlan(plan) {
    const response = await axios.post(URL + "/plan", plan);
}

export async function updatePlan(id) {

}