import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import suppliersRouter from "./suppliers";
import collectionsRouter from "./collections";
import hampersRouter from "./hampers";
import corporatesRouter from "./corporates";
import corporateContactsRouter from "./corporate-contacts";
import quotesRouter from "./quotes";
import ordersRouter from "./orders";
import recipientsRouter from "./recipients";
import invoicesRouter from "./invoices";
import dashboardRouter from "./dashboard";
import searchRouter from "./search";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(suppliersRouter);
router.use(collectionsRouter);
router.use(hampersRouter);
router.use(corporatesRouter);
router.use("/corporates/:corporateId/contacts", corporateContactsRouter);
router.use(quotesRouter);
router.use(ordersRouter);
router.use(recipientsRouter);
router.use(invoicesRouter);
router.use(dashboardRouter);
router.use(searchRouter);
router.use(settingsRouter);

export default router;
