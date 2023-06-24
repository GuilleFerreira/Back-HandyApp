


//TODO ARREGLAR ERRORS RESPONSE

import { selectSkills } from "../querys/getSkillsQueries";

export const getSkills = async (_req, res) => {
    try {

        const skills = await selectSkills();
        res.status(200).send({skills});

    } catch (e) {
        console.log(e);
        res.status(500).send({ error: true, message: "Internal server error getting problems", name: 'ServerError' });
    }
};